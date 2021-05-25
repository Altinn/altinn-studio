/* 
    Test data required: username and password
    Command: docker-compose run k6 run /src/tests/platform/authentication/authentication.js 
    -e env=*** -e username=*** -e userpwd=*** -e appsaccesskey=***
*/

import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
};

//Tests for platform authentication
export default function () {
  //Authenticate towards Altinn 2
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  //Authenticate towards Altinn 3
  setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
}

export function handleSummary(data) {
  let result = {};
  result['stdout'] = textSummary(data, { indent: ' ', enableColors: true});
  result[reportPath('platformAuthn')] = generateJUnitXML(data, 'platform-authentication');
  return result;
}
