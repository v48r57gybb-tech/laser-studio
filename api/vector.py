import base64, hashlib, hmac, io, json, math, os, re
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlsplit
from pypdf import PdfReader
from pypdf.generic import ContentStream
from reportlab.pdfgen import canvas
from shapely.geometry import Polygon

MAX_BYTES=2*1024*1024
MACHINING_RE=re.compile(r'(?i)(filett|thread|\bm\s?\d|ciec|blind|tasca|pocket|lamatur|counterbore|svasat|countersink|prof\.?\s*\d|profondit|depth|fresat|milled|incass|spotface|chamfer)')

def extract(data,page_number=1):
    reader=PdfReader(io.BytesIO(data))
    if reader.is_encrypted or not 1<=len(reader.pages)<=10:
        raise ValueError('PDF protetto o numero pagine non supportato')
    if type(page_number) is not int or not 1<=page_number<=len(reader.pages):
        raise ValueError('Pagina non valida')
    page=reader.pages[page_number-1]
    if page.rotation or float(page.get('/UserUnit',1))!=1:
        raise ValueError('Rotazione pagina o UserUnit non supportati in questa versione')
    operations=ContentStream(page.get_contents(),reader).operations
    if len(operations)>30000:
        raise ValueError('Pagina troppo complessa')
    matrix=(1,0,0,1,0,0);stack=[];path=[];loops=[];pending=[];current=None;texts=[]
    def visitor(text,cm,tm,font_dict,font_size):
        if text and text.strip():
            a,b,c,d,e,f=cm;x,y=tm[4],tm[5]
            texts.append((text.strip(),a*x+c*y+e,b*x+d*y+f))
    try:page.extract_text(visitor_text=visitor)
    except Exception:texts=[]
    def point(x,y):
        a,b,c,d,e,f=matrix
        p=(a*float(x)+c*float(y)+e,b*float(x)+d*float(y)+f)
        if not all(math.isfinite(v) and abs(v)<100000 for v in p):
            raise ValueError('Coordinate non valide')
        return p
    def finish():
        nonlocal path,current
        if path and current is not None:
            first=path[0][1:]
            if math.dist(first,current)<0.001:
                pts=[tuple(first)];last=tuple(first)
                for cmd in path[1:]:
                    if cmd[0]=='L':
                        last=tuple(cmd[1:]);pts.append(last)
                    elif cmd[0]=='C':
                        start=last
                        for i in range(1,33):
                            t=i/32;u=1-t
                            pts.append((u**3*start[0]+3*u*u*t*cmd[1]+3*u*t*t*cmd[3]+t**3*cmd[5],u**3*start[1]+3*u*t*t*cmd[2]+3*u*t*t*cmd[4]+t**3*cmd[6]))
                        last=tuple(cmd[5:])
                poly=Polygon(pts) if len(pts)>=4 else None
                if poly is not None and poly.is_valid and poly.area>0.01:
                    pending.append({'commands':path[:],'polygon':poly})
        path=[];current=None
    def close():
        nonlocal current
        if path:
            first=tuple(path[0][1:])
            if current!=first:path.append(['L',*first])
            current=first
    for args,op in operations:
        if op in (b'Do',b'W',b'W*',b'BI',b'INLINE IMAGE'):
            raise ValueError('Immagini, form o clipping: estrazione non supportata, nessuna sagoma inventata')
        if op==b'q':stack.append(matrix)
        elif op==b'Q':
            if not stack:raise ValueError('Stato grafico PDF non valido')
            matrix=stack.pop()
        elif op==b'cm':
            a,b,c,d,e,f=matrix;g,h,i,j,k,l=map(float,args)
            matrix=(a*g+c*h,b*g+d*h,a*i+c*j,b*i+d*j,a*k+c*l+e,b*k+d*l+f)
        elif op==b'm':
            if path:finish()
            current=point(*args);path=[['M',*current]]
        elif op==b'l' and current is not None:
            current=point(*args);path.append(['L',*current])
        elif op in (b'c',b'v',b'y') and current is not None:
            if op==b'c':p1=point(*args[:2]);p2=point(*args[2:4]);end=point(*args[4:])
            elif op==b'v':p1=current;p2=point(*args[:2]);end=point(*args[2:])
            else:p1=point(*args[:2]);end=point(*args[2:]);p2=end
            path.append(['C',*p1,*p2,*end]);current=end
        elif op==b're':
            if path:finish()
            x,y,w,h=map(float,args);corners=[point(x,y),point(x+w,y),point(x+w,y+h),point(x,y+h)]
            path=[['M',*corners[0]]]+[['L',*p] for p in corners[1:]];current=corners[-1];close()
        elif op==b'h':close()
        elif op in (b'S',b's'):
            if op==b's':close()
            finish();loops.extend(pending);pending=[]
        elif op in (b'f',b'F',b'f*',b'B',b'B*',b'b',b'b*',b'n'):
            path=[];current=None;pending=[]
        if len(loops)>200 or len(path)>1500:
            raise ValueError('Troppi contorni')
    if not loops:raise ValueError('Nessun contorno vettoriale chiuso supportato')
    return loops,texts

def is_circle(p):
    x,y,X,Y=p.bounds;w=X-x;h=Y-y
    if w<=0 or h<=0 or abs(w-h)>max(0.8,0.03*max(w,h)):return False
    return abs(p.area-math.pi*(w/2)**2)<0.12*math.pi*(w/2)**2

def classify(loops,texts):
    excluded={};circles=[]
    for i,item in enumerate(loops):
        p=item['polygon']
        if is_circle(p):
            x,y,X,Y=p.bounds;circles.append((i,(x+X)/2,(y+Y)/2,(X-x)/2))
    for i,cx,cy,r in circles:
        for j,ox,oy,orr in circles:
            if i!=j and math.hypot(cx-ox,cy-oy)<1.0 and orr>r+0.5:
                excluded[i]='Cerchio concentrico esterno: probabile lamatura, svasatura o filetto; conservato il foro interno.'
                break
    for i,item in enumerate(loops):
        if i in excluded:continue
        p=item['polygon'];px,py=p.representative_point().coords[0]
        for text,tx,ty in texts:
            if MACHINING_RE.search(text) and math.hypot(px-tx,py-ty)<30:
                excluded[i]='Richiamo tecnico vicino al contorno: '+text[:70]
                break
    return excluded

def inspect(loops,texts):
    excluded=classify(loops,texts)
    result=[]
    for i,item in enumerate(loops):
        p=item['polygon'];x,y,X,Y=p.bounds
        result.append({'id':i,'widthMm':round((X-x)*25.4/72,4),'heightMm':round((Y-y)*25.4/72,4),'area':p.area,'inside':[j for j,v in enumerate(loops) if j!=i and p.contains(v['polygon'])],'autoExclude':i in excluded,'autoExcludeReason':excluded.get(i,'')})
    all_bounds=[v['polygon'].bounds for v in loops]
    x=min(v[0] for v in all_bounds);y=min(v[1] for v in all_bounds);X=max(v[2] for v in all_bounds);Y=max(v[3] for v in all_bounds)
    paths=[]
    for i,item in enumerate(loops):
        d=' '.join(cmd[0]+' '+' '.join(str(v) for v in cmd[1:]) for cmd in item['commands'])+' Z'
        p=item['polygon'].representative_point()
        color='#c62828' if i in excluded else '#174f8c'
        paths.append('<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="0.6"/><text x="'+str(p.x)+'" y="'+str(p.y)+'" font-size="9" transform="translate(0 '+str(2*p.y)+') scale(1 -1)">'+str(i)+'</text>')
    svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+str(x-10)+' '+str(-Y-10)+' '+str(X-x+20)+' '+str(Y-y+20)+'"><g transform="scale(1 -1)">'+''.join(paths)+'</g></svg>'
    return {'candidates':result,'autoExcluded':excluded,'previewBase64':base64.b64encode(svg.encode()).decode(),'warning':'Classificazione automatica di supporto: i contorni rossi sono esclusi dal taglio per richiami tecnici o cerchi concentrici esterni. Verificare sempre la selezione; non e una validazione di fattibilita laser.'}

def export_pdf(loops,outer,holes,texts):
    if type(outer) is not int or not 0<=outer<len(loops) or not isinstance(holes,list) or len(holes)>100 or any(type(h) is not int or not 0<=h<len(loops) for h in holes) or len(set(holes))!=len(holes) or outer in holes:
        raise ValueError('Selezione contorni non valida')
    excluded=classify(loops,texts)
    kept=[h for h in holes if h not in excluded]
    skipped=[h for h in holes if h in excluded]
    op=loops[outer]['polygon'];hp=[loops[h]['polygon'] for h in kept]
    if any(not op.contains(p) for p in hp) or any(a.intersects(b) for i,a in enumerate(hp) for b in hp[i+1:]):
        raise ValueError('Aperture non interne, sovrapposte o annidate')
    x,y,X,Y=op.bounds;margin=40;width=max(595,X-x+2*margin);height=max(350,Y-y+130)
    output=io.BytesIO();c=canvas.Canvas(output,pagesize=(width,height));c.setTitle('Sagoma vettoriale selezionata - nominale 1:1');c.setLineWidth(0.5)
    for index in [outer]+kept:
        path=c.beginPath()
        for cmd in loops[index]['commands']:
            coords=[v+(margin-x if j%2==0 else 80-y) for j,v in enumerate(cmd[1:])]
            if cmd[0]=='M':path.moveTo(*coords)
            elif cmd[0]=='L':path.lineTo(*coords)
            else:path.curveTo(*coords)
        path.close();c.drawPath(path,stroke=1,fill=0)
    c.setFont('Helvetica',8)
    lines=['Sovrametallo previsto: 5 mm per lato. Solo nota: non applicato alla geometria.', 'Dimensioni conservate dal PDF sorgente, senza offset. Scala 1:1 del PDF, da verificare sulle quote.', 'Selezione operatore - non validata per produzione. Stampare al 100%, senza adattamento.']
    if skipped:lines.append('Esclusione automatica attiva: contorni '+', '.join(str(h) for h in skipped)+' non inseriti come tagli.')
    for i,line in enumerate(lines):
        c.drawString(20,48-i*11,line)
    c.showPage();c.save();return output.getvalue()

class handler(BaseHTTPRequestHandler):
    def reply(self,status,data):
        encoded=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(encoded)
    def do_POST(self):
        password=os.environ.get('LASER_ACCESS_PASSWORD','')
        if len(password)<20:return self.reply(503,{'error':'Password server non configurata'})
        supplied=self.headers.get('x-laser-password','')
        if not hmac.compare_digest(hashlib.sha256(supplied.encode()).digest(),hashlib.sha256(password.encode()).digest()):return self.reply(401,{'error':'Password non corretta'})
        if self.headers.get('Origin') and urlsplit(self.headers['Origin']).netloc!=self.headers.get('Host'):return self.reply(403,{'error':'Origine non consentita'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<2900000:raise ValueError('Richiesta troppo grande')
            body=json.loads(self.rfile.read(length))
            if body.get('consent') is not True:raise ValueError('Consenso richiesto')
            data=base64.b64decode(body.get('pdf',''),validate=True)
            if not 0<len(data)<=MAX_BYTES:raise ValueError('PDF massimo 2 MB')
            loops,texts=extract(data,body.get('page',1))
            if body.get('action')=='inspect':return self.reply(200,inspect(loops,texts))
            if body.get('action')=='export':
                if body.get('scaleConfirmed') is not True:raise ValueError('Confermare scala sorgente e selezione')
                pdf=export_pdf(loops,body.get('outer'),body.get('holes'),texts)
                return self.reply(200,{'pdfBase64':base64.b64encode(pdf).decode()})
            raise ValueError('Azione non valida')
        except ValueError as e:return self.reply(400,{'error':str(e)[:240]})
        except Exception:return self.reply(400,{'error':'PDF non supportato o elaborazione fallita. Nessuna sagoma generata.'})
    def do_GET(self):return self.reply(405,{'error':'Usare la pagina /vector.html'})
