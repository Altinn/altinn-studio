import { parseArgs } from 'node:util';
import { fetchObservations, fetchTraces } from './langfuseClient.js';
import { aggregate } from './aggregate.js';

const { values } = parseArgs({
  options: {
    from: { type: 'string' },
    to: { type: 'string' },
    serviceOwner: { type: 'string' },
  },
});

if (!values.from || !values.to) {
  process.stderr.write(
    'Usage: node fetchLlmCosts.js --from <ISO> --to <ISO> [--serviceOwner <code>]\n',
  );
  process.exit(1);
}

if (new Date(values.from) >= new Date(values.to)) {
  process.stderr.write('--from must be before --to\n');
  process.exit(1);
}

const loadedAt = new Date().toISOString();

const [traces, observations] = await Promise.all([
  fetchTraces({ userId: values.serviceOwner, fromTimestamp: values.from, toTimestamp: values.to }),
  fetchObservations({
    userId: values.serviceOwner,
    fromStartTime: values.from,
    toStartTime: values.to,
  }),
]);

const tracesByTraceId = new Map(traces.map((trace) => [trace.id, trace]));
const rows = aggregate(observations, tracesByTraceId, loadedAt);

process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
