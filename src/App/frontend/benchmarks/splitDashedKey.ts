/* eslint-disable no-console */
import { Bench } from 'tinybench';

import { splitDashedKey, splitDashedKeyIterative, splitDashedKeyRegex } from 'src/utils/splitDashedKey';

const inputs: string[] = ['mycomponent-0-1', 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6-100-200'];

const bench = new Bench({
  name: 'splitDashedKey benchmark',
  time: 100,
  setup: (_task, mode) => {
    // Run the garbage collector before warmup at each cycle
    if (mode === 'warmup' && typeof globalThis.gc === 'function') {
      globalThis.gc();
    }
  },
});

for (const input of inputs) {
  bench
    .add(`[${input}] original`, () => splitDashedKey(input))
    .add(`[${input}] regex`, () => splitDashedKeyRegex(input))
    .add(`[${input}] iterative`, () => splitDashedKeyIterative(input));
}

bench.run().then(() => {
  const table = bench.table();

  console.log(bench.name);
  console.table(table);
});
