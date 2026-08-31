const METRIC_NAMES = ['altinn_app_lib_processes_started', 'altinn_app_lib_processes_ended'];
const ERROR_METRIC_NAMES = ['failed_process_next_requests', 'failed_instance_creation_requests'];
const APPS = ['mocked-app-one', 'mocked-app-two', 'mocked-app-empty'];

const getBucketSize = (range) => {
  const maxPoints = 12;
  const candidates = [5, 15, 30, 60, 180, 360, 720, 1440, 2880];
  return candidates.find((c) => range / c <= maxPoints) ?? 4320;
};

const buildSeries = (range, seed) => {
  const bucketSize = getBucketSize(range);
  const buckets = Math.max(1, Math.floor(range / bucketSize));
  const now = Date.now();
  const timestamps = [];
  const counts = [];
  for (let i = buckets - 1; i >= 0; i--) {
    timestamps.push(now - i * bucketSize * 60 * 1000);
    counts.push(Math.floor(Math.abs(Math.sin(seed + i)) * 25));
  }
  return { timestamps, counts, bucketSize };
};

export const reportMetricsRoute = (req, res) => {
  const range = parseInt(req.query.range ?? '1440', 10);
  const { org, env } = req.params;
  const bucketSize = getBucketSize(range);

  const metrics = [];
  const errorMetrics = [];
  let seed = 1;
  for (const app of APPS.slice(0, 2)) {
    for (const name of METRIC_NAMES) {
      metrics.push({ appName: app, name, ...buildSeries(range, seed++) });
    }
    for (const name of ERROR_METRIC_NAMES) {
      errorMetrics.push({
        appName: app,
        name,
        ...buildSeries(range, seed++),
        logsUrl: `https://portal.azure.example/logs/${org}/${env}/${app}`,
      });
    }
  }
  // mocked-app-empty deliberately has no series, mirroring the gateway's zero-padding
  for (const name of METRIC_NAMES) {
    metrics.push({ appName: APPS[2], name, timestamps: [], counts: [], bucketSize });
  }
  for (const name of ERROR_METRIC_NAMES) {
    errorMetrics.push({
      appName: APPS[2],
      name,
      timestamps: [],
      counts: [],
      bucketSize,
      logsUrl: `https://portal.azure.example/logs/${org}/${env}/${APPS[2]}`,
    });
  }

  console.log(`Report metrics requested: org=${org} env=${env} range=${range}`);
  res.json({ apps: APPS, metrics, errorMetrics });
};

// Minimal valid single-page PDF so the caller gets real application/pdf bytes.
const DUMMY_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
trailer<</Root 1 0 R>>
%%EOF`,
  'utf-8',
);

export const generatePdfRoute = (req, res) => {
  console.log(`PDF generation requested: url=${req.body?.url} waitFor=${req.body?.waitFor}`);
  res.status(200).contentType('application/pdf').send(DUMMY_PDF);
};
