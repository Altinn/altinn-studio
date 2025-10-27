import http from 'k6/http';
import encoding from 'k6/encoding';
import { check } from 'k6';
import { expect } from 'https://jslib.k6.io/k6-testing/0.5.0/index.js';

const requiredEnvVars = [
  'PID',
  'PARTY_ID',
  'USER_ID',
  'INSTANCE_ID',
  'ENV',
  'SCOPES',
  'APP_OWNER',
  'APP_NAME',
];
const missingVars = requiredEnvVars.filter((varName) => !__ENV[varName]);
if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}. Please set these before running the test to avoid accidentally committing secrets.`,
  );
}

const PID = __ENV.PID;
const PARTY_ID = __ENV.PARTY_ID;
const USER_ID = __ENV.USER_ID;
const INSTANCE_ID = __ENV.INSTANCE_ID;
const ENV = __ENV.ENV;
const APP_OWNER = __ENV.APP_OWNER;
const APP_NAME = __ENV.APP_NAME;
const SCOPES = __ENV.SCOPES;
const ENCODED_SCOPES = encodeURIComponent(SCOPES);
// AT environments (at21, at22, at23, at24, etc.) use altinn.cloud, others use altinn.no
const TOP_DOMAIN = ENV.toLowerCase().startsWith('at') ? 'altinn.cloud' : 'altinn.no';
const BASE_URL = `https://${APP_OWNER}.apps.${ENV}.${TOP_DOMAIN}/${APP_OWNER}/${APP_NAME}`;

const TEST_TOOLS_USERNAME = __ENV.ALTINN_TESTTOOLS_USERNAME;
const TEST_TOOLS_PASSWORD = __ENV.ALTINN_TESTTOOLS_PASSWORD;

export const options = {
  scenarios: {
    ui: {
      executor: 'constant-arrival-rate',
      rate: 3,
      timeUnit: '1s',
      duration: '5m',
      gracefulStop: '30s',
      preAllocatedVUs: 20,
      maxVUs: 50,
      // options: {
      //   browser: {
      //     type: "chromium",
      //   },
      // },
    },
  },
};

export function setup() {
  const authBaseUrl = `https://altinn-testtools-token-generator.azurewebsites.net`;
  const authUrl = `${authBaseUrl}/api/GetPersonalToken?env=${ENV}&scopes=${ENCODED_SCOPES}&partyId=${PARTY_ID}&pid=${PID}&userId=${USER_ID}`;
  const encodedCredentials = encoding.b64encode(`${TEST_TOOLS_USERNAME}:${TEST_TOOLS_PASSWORD}`);
  const res = http.get(authUrl, { headers: { Authorization: `Basic ${encodedCredentials}` } });
  expect(
    res.status,
    `Got unexpected status code ${res.status} when trying to setup. Exiting.`,
  ).toBe(200);
  return { token: res.body };
}

export default async function (data) {
  const token = data.token;
  const headers = {
    // NOTE: using the cookie jar unfortunately doesn't work, we get 400
    // presumably due to missing XSRF token cookies that are normally present
    // We can use k6/browser module if we want to be more portal-user-like
    Authorization: `Bearer ${token}`,
  };

  // 1. Instantiate
  // const instantiation = http.post(
  //   `${BASE_URL}/instances/create?language=nb`,
  //   JSON.stringify({
  //     "prefill": {},
  //     "instanceOwner": {
  //       "partyId": PARTY_ID
  //     }
  //   }),
  //   { headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', } }
  // );
  // check(instantiation, {
  //   'instantiation succeeds': r => r.status === 201,
  // });
  // if (instantiation.status != 201) {
  //   return;
  // }
  // const instance = JSON.parse(instantiation.body);

  // 2. Render PDF preview for empty instance for now
  const preview = http.get(`${BASE_URL}/instances/${PARTY_ID}/${INSTANCE_ID}/pdf/preview`, {
    headers: headers,
    timeout: '30s',
  });
  check(preview, {
    'PDF rendering succeeds': (r) =>
      r.status === 200 &&
      r.headers['Content-Type']?.includes('application/pdf') &&
      !!r.body &&
      r.body.slice(0, 5) === '%PDF-',
  });

  // 3. Delete the instance if possible
  // const deletion = http.del(
  //   `${BASE_URL}/instances/${instance.id}?hard=true`,
  //   { headers: headers }
  // );
  // expect(
  //   deletion.status,
  //   `Got unexpected status code ${deletion.status} for instance deletion:\n${deletion.body}`
  // ).toBe(200);
}
