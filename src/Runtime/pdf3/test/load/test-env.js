import http from "k6/http";
import encoding from 'k6/encoding';
import { check } from 'k6';
import { expect } from 'https://jslib.k6.io/k6-testing/0.5.0/index.js';

// Uses app
// - https://altinn.studio/editor/ttd/subform-test/overview
// - https://ttd.apps.at24.altinn.cloud/ttd/subform-test/
const PID = "43913000170";
const PARTY_ID = "50940728";
const USER_ID = "20847028";
const APP_OWNER = "ttd";
const APP_NAME = "subform-test";
const SCOPES = "altinn:portal/enduser";
const INSTANCE_ID="3751c1ea-747f-4104-ba00-4d48211ebd2e"
const ENV = "at24";
const ENCODED_SCOPES = encodeURIComponent(SCOPES);
const TOP_DOMAIN = "altinn.cloud";
// const PARTY_ID = "51242501";
// const USER_ID = "2185701";
// const APP_OWNER = "ttd";
// const APP_NAME = "martinotest";
// const SCOPES = "altinn:instances.read altinn:instances.write";
// const ENV = "tt02";
// const ENCODED_SCOPES = encodeURIComponent(SCOPES);
// const TOP_DOMAIN = "altinn.no";
const BASE_URL = `https://${APP_OWNER}.apps.${ENV}.${TOP_DOMAIN}/${APP_OWNER}/${APP_NAME}`;

const TEST_TOOLS_USERNAME = __ENV.ALTINN_TESTTOOLS_USERNAME;
const TEST_TOOLS_PASSWORD = __ENV.ALTINN_TESTTOOLS_PASSWORD;

export const options = {
  scenarios: {
    ui: {
      executor: 'constant-arrival-rate',
      rate: 3,
      timeUnit: '1s',
      duration: '120s',
      gracefulStop: '0s',
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
  const authBaseUrl = `https://altinn-testtools-token-generator.azurewebsites.net`
  const authUrl = `${authBaseUrl}/api/GetPersonalToken?env=${ENV}&scopes=${ENCODED_SCOPES}&partyId=${PARTY_ID}&pid=${PID}&userId=${USER_ID}`
  const encodedCredentials = encoding.b64encode(`${TEST_TOOLS_USERNAME}:${TEST_TOOLS_PASSWORD}`);
  const res = http.get(authUrl, { headers: { Authorization: `Basic ${encodedCredentials}` } });
  expect(res.status, `Got unexpected status code ${res.status} when trying to setup. Exiting.`).toBe(200);
  return { token: res.body }
}

export default async function(data) {
  const token = data.token;
  const headers = {
    // NOTE: using the cookie jar unfortunately doesn't work, we get 400
    // presumably due to missing XSRF token cookies that are normally present
    // We can use k6/browser module if we want to be more portal-user-like
    'Authorization': `Bearer ${token}`,
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
  const preview = http.get(
    `${BASE_URL}/instances/${PARTY_ID}/${INSTANCE_ID}/pdf/preview`,
    { headers: headers }
  );
  check(preview, {
    'PDF rendering succeeds': r => (
      r.status === 200 &&
      r.headers['Content-Type']?.includes('application/pdf') &&
      !!r.body &&
      r.body.slice(0, 5) === '%PDF-'
    ),
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

