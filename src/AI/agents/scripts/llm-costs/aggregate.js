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
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        tokensByModel: new Map(),
      });
    }

    const bucket = buckets.get(key);
    if (obs.traceId) bucket.traceIds.add(obs.traceId);
    bucket.inputTokens += obs.usage?.input ?? 0;
    bucket.outputTokens += obs.usage?.output ?? 0;
    bucket.totalTokens += obs.usage?.total ?? 0;

    let model = obs.model;
    if (!model) {
      console.warn(
        `Missing model for observation on trace ${obs.traceId} — bucketing under 'unknown'`,
      );
      model = 'unknown';
    }
    if (!bucket.tokensByModel.has(model)) bucket.tokensByModel.set(model, {});
    const modelTokens = bucket.tokensByModel.get(model);
    for (const [usageKey, usageValue] of Object.entries(obs.usageDetails ?? {})) {
      modelTokens[usageKey] = (modelTokens[usageKey] ?? 0) + usageValue;
    }
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
      input_tokens: bucket.inputTokens,
      output_tokens: bucket.outputTokens,
      total_tokens: bucket.totalTokens,
      tokens_by_model: Object.fromEntries(bucket.tokensByModel),
    };
  });
}
