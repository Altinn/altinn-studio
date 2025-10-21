import http from 'k6/http';
import { check } from 'k6';
import { scenario } from 'k6/execution';

export const options = {
  scenarios: {
    old_service: {
      executor: 'constant-arrival-rate',
      rate: 3,
      timeUnit: '1s',
      duration: '60s',
      gracefulStop: '0s',
      preAllocatedVUs: 10,
      maxVUs: 15,
      tags: { service: 'old' },
    },
    new_service: {
      executor: 'constant-arrival-rate',
      rate: 3,
      timeUnit: '1s',
      duration: '60s',
      startTime: '60s',  // duration + gracefulStop
      preAllocatedVUs: 8,
      maxVUs: 15,
      tags: { service: 'new' },
    },
  },
  thresholds: {
    // HTTP metrics
    'http_req_duration{service:old}': ['p(95)<10000'],
    'http_req_duration{service:new}': ['p(95)<10000'],

    // Execution metrics - add thresholds to show in summary
    'dropped_iterations{service:old}': [],
    'dropped_iterations{service:new}': [],
    'iteration_duration{service:old}': [],
    'iteration_duration{service:new}': [],
    'iterations{service:old}': [],
    'iterations{service:new}': [],

    // Network metrics
    'data_received{service:old}': [],
    'data_received{service:new}': [],
    'data_sent{service:old}': [],
    'data_sent{service:new}': [],
  },
};

const payload = JSON.stringify({
  url: 'http://testserver.default.svc.cluster.local/app/',
  options: {
    headerTemplate: '<div/>',
    footerTemplate: '<div/>',
    displayHeaderFooter: false,
    printBackground: true,
    format: 'A4',
    margin: {
      top: '0.75in',
      right: '0.75in',
      bottom: '0.75in',
      left: '0.75in',
    },
  },
  setJavaScriptEnabled: true,
  waitFor: '#readyForPrint',
  cookies: [
    {
      name: 'AltinnStudioRuntime',
      value: 'cookie-for-testing',
      domain: 'testserver.default.svc.cluster.local',
      sameSite: 'Lax',
    },
  ],
});

const endpoint = 'http://localhost:8020/pdf';

http.setResponseCallback(
  http.expectedStatuses(200, 429)
);

export default function () {
  const service = scenario.name === 'new_service' ? 'new' : 'old';
  const host =
    service === 'old'
      ? 'pdf-generator.pdf.svc.cluster.local'
      : 'pdf3-proxy.runtime-pdf3.svc.cluster.local';
  const tags = { service: service };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Host: host,
    },
    tags: tags,
  };

  const res = http.post(endpoint, payload, params);

  check(res, {
    [`[${service}] PDF generation success`]: (r) => {
      return r.status === 200 &&
        r.headers['Content-Type']?.includes('application/pdf') &&
        !!r.body &&
        r.body.slice(0, 5) === '%PDF-';
    },
  }, tags);
}
