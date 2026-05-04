import { env } from 'node:process';
import { LANGFUSE_HOST } from './constants.js';

function requireEnv(name) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const LANGFUSE_PUBLIC_KEY = requireEnv('LANGFUSE_PUBLIC_KEY');
const LANGFUSE_SECRET_KEY = requireEnv('LANGFUSE_SECRET_KEY');

function basicAuthHeader() {
  return 'Basic ' + Buffer.from(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`).toString('base64');
}

async function getPage(path, searchParams) {
  const url = new URL(path, LANGFUSE_HOST);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: basicAuthHeader() },
  });

  if (!response.ok) {
    throw new Error(`Langfuse API error ${response.status} for ${url}: ${await response.text()}`);
  }

  return response.json();
}

async function* fetchAllPages(path, searchParams, pageSize = 50) {
  let page = 1;
  while (true) {
    const data = await getPage(path, { ...searchParams, limit: pageSize, page });
    const items = data.data ?? [];
    yield* items;
    if (items.length < pageSize) break;
    page++;
  }
}

export async function fetchTraces({ userId, fromTimestamp, toTimestamp }) {
  const traces = [];
  for await (const trace of fetchAllPages('/api/public/traces', {
    userId,
    fromTimestamp,
    toTimestamp,
  })) {
    traces.push(trace);
  }
  return traces;
}

export async function fetchObservations({ userId, fromStartTime, toStartTime }) {
  const observations = [];
  for await (const obs of fetchAllPages('/api/public/observations', {
    userId,
    fromStartTime,
    toStartTime,
    type: 'GENERATION',
  })) {
    observations.push(obs);
  }
  return observations;
}
