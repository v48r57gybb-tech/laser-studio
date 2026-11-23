# Baseline — Lavorazione da progetto v2

## Ramo e punto di partenza

- Ramo: `feature/lavorazione-progetto-v2`
- Commit di partenza: `aec4783d414734a423498dfd0bf6aee41ffecdf0`
- Ramo protetto: `main` non viene modificato direttamente
- Obiettivo: costruire una nuova sezione “Lavorazione da progetto” senza eliminare o degradare Dritto, Curvo e Grezzo

## Stato iniziale

La baseline parte dal codice esistente sul ramo `fix/phase-operation-tool-linkage`. I moduli attuali di analisi, assegnazione utensili, percorsi, ISO, simulazione e test restano disponibili e non vengono cancellati indiscriminatamente.

## Moduli rilevanti

- `project-analysis.js`: importazione e validazione dell’analisi progetto
- `project-tool-assignment.js`: assegnazione e libreria utensili adattivi
- `project-operation-linker.js`, `project-linker.js`, `project-linker-ui.js`: collegamento operazioni
- `project-phase-program.js`, `project-step-worker.js`: programmazione e lavorazione per fase
- `stock-operation-path.js`, `stock-sim.js`, `stock-simulation-tools.js`: percorsi e simulazione esistenti
- `iso-v2.js`: generazione ISO esistente
- `tests/`, `browser-tests/`, `scripts/`: test e strumenti disponibili

## Regole di non-regressione

1. Non cancellare file o funzioni esistenti senza una migrazione esplicita e testata.
2. Non modificare `main` direttamente.
3. Non dichiarare completa una funzione senza implementazione e verifica.
4. Non inventare geometrie, utensili, montaggi, parametri o dati di produzione mancanti.
5. Non trasformare automaticamente un’analisi importata in una verifica locale.
6. Non generare ISO parziale presentandolo come programma completo.
7. Bloccare esplicitamente le lavorazioni con dati mancanti o non supportati.
8. Preservare le funzioni di Dritto, Curvo e Grezzo e verificare eventuali regressioni.
9. Separare sempre dati disponibili, ipotesi, decisioni richieste e risultati verificati.
10. Usare RIC0075/SETUP01 come caso di accettazione storico.

## Piano di lavoro

| Fase | Consegna | Criterio di avanzamento |
|---|---|---|
| 1 | Contratto dati e migrazione | Schema corretto, proiezione digest, fixture valide/invalide |
| 2 | Importazione e salvataggio | Import, bozza, allegati, frame e setup senza perdita di dati |
| 3 | Piazzamenti e zeri | Setup, frame, zero e sistema di lavoro coerenti |
| 4 | Operazioni e lavorazioni | OP, target, ruoli, dipendenze e copertura identificabili |
| 5 | Utensili e montaggi | Libreria, impieghi, montaggi e accessi senza doppioni |
| 6 | Percorsi | Strategie e parametri supportati; blocchi espliciti per il resto |
| 7 | ISO | Profilo post versionato e copertura per blocco |
| 8 | Simulazione | Identità dell’artefatto, replay e controlli separati |
| 9 | RIC0075 | Flusso end-to-end entro i dati disponibili |
| 10 | Integrazione | Regressioni su Dritto, Curvo e Grezzo |

## Limiti dichiarati

Questa baseline non implementa la nuova sezione e non modifica il comportamento dell’applicazione. Le funzioni di pianificazione, generazione ISO, simulazione e verifica geometrica saranno considerate complete soltanto dopo implementazione e test sul ramo dedicato.
