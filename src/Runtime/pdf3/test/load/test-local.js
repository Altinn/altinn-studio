import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    pdf: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '1s',
      duration: '1h',
      gracefulStop: '10s',
      preAllocatedVUs: 10,
      maxVUs: 30,
    },
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

export default function () {
  const host = 'pdf-generator.pdf.svc.cluster.local';

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Host: host,
    },
  };

  const res = http.post(endpoint, payload, params);

  check(res, {
    [`PDF generation success`]: (r) => {
      return (
        r.status === 200 &&
        r.headers['Content-Type']?.includes('application/pdf') &&
        !!r.body &&
        r.body.slice(0, 5) === '%PDF-'
      );
    },
  });
}
