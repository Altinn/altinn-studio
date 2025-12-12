import { newEntry } from 'nextsrc/nextpoc';
import { createRootTanstack } from 'nextsrc/nexttanstack';

const useLegacy = false;

if (useLegacy) {
  createRootTanstack();
} else {
  newEntry();
}
