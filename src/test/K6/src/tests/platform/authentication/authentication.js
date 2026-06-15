/*
    Test data required: username and password
    Command: docker-compose run k6 run /src/tests/platform/authentication/authentication.js
    -e env=*** -e pid=*** -e testidppwd=*** -e appsaccesskey=***
*/

import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

export const options = {
  thresholds: {
    checks: ['rate==1.0'],
  },
};

//Tests for platform authentication
export default function () {
  setUpData.getAltinnTokenForUser();
}

export function handleSummary(data) {
  let result = {};
  result['stdout'] = textSummary(data, { indent: ' ', enableColors: true });
  result[reportPath('platformAuthn.xml')] = generateJUnitXML(data, 'platform-authentication');
  return result;
}
