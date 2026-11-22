import {motionDuration,advanceMotion} from './stock-motion-timing.mjs';
import {createEditor} from './project-simulation-editor.mjs';
export const createPhasePlayback=createEditor({advanceMotion,motionDuration});
