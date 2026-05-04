import { LANGFUSE_HOST } from './constants.js';

function toDateString(isoTimestamp) {
  return isoTimestamp.slice(0, 10);
}

/**
 * @param {object[]} observations - GENERATION observations from Langfuse
 * @param {Map<string, object>} tracesByTraceId - traces keyed by trace id
 * @param {string} loadedAt - ISO timestamp of script run
 * @returns {object[]} - aggregated schema rows
 */
export function aggregate(observations, tracesByTraceId, loadedAt) {
  const buckets = new Map();

  for (const obs of observations) {
    const trace = tracesByTraceId.get(obs.traceId);
    if (!trace) throw new Error(`Missing trace ${obs.traceId} for observation ${obs.id}`);

    let appName = trace.metadata?.app_name;
    if (!appName) {
      console.warn(`Missing metadata.app_name for trace ${trace.id} — bucketing under 'unknown'`);
      appName = 'unknown';
    }

    const serviceOwnerCode = trace.userId;
    if (!serviceOwnerCode) throw new Error(`Missing service owner code for ${trace.id}`);

    const date = toDateString(obs.startTime);
    const key = `${serviceOwnerCode}-${appName}-${date}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        date,
        serviceOwnerCode,
        appName,
        traceIds: new Set(),
        totalCostUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });
    }

    const bucket = buckets.get(key);
    if (obs.traceId) bucket.traceIds.add(obs.traceId);
    bucket.totalCostUsd += obs.calculatedTotalCost ?? 0;
    bucket.inputTokens += obs.usage?.input ?? 0;
    bucket.outputTokens += obs.usage?.output ?? 0;
    bucket.totalTokens += obs.usage?.total ?? 0;
  }

  return Array.from(buckets.values()).map((bucket) => {
    const [y, m, d] = bucket.date.split('-');
    return {
      date: bucket.date,
      year: y,
      month: m,
      day: d,
      serviceownerorgnr: null,
      serviceownercode: bucket.serviceOwnerCode,
      messagesender: bucket.serviceOwnerCode,
      serviceresourceid: bucket.appName,
      serviceresourcetitle: null,
      recipienttype: null,
      costcenter: null,
      messagecount: null,
      instancecount: null,
      databasestoragebytes: null,
      attachmentstoragebytes: null,
      loaded_at: loadedAt,
      source_file: `${LANGFUSE_HOST}`,
      total_cost_usd: bucket.totalCostUsd,
      input_tokens: bucket.inputTokens,
      output_tokens: bucket.outputTokens,
      total_tokens: bucket.totalTokens,
    };
  });
}
