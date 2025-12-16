import { newEntry } from 'nextsrc/nextpoc';
import { createRootTanstack } from 'nextsrc/nexttanstack';

const useTanstackVersion = false;

if (useTanstackVersion) {
  createRootTanstack();
} else {
  newEntry();
}
