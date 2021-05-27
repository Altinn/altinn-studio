/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run /src/tests/platform/register/register.js 
    -e env=*** -e org=*** -e level2app=*** -e username=*** -e userpwd=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as register from '../../../api/platform/register.js';
import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return userData
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  setUpData.clearCookies();
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  return data;
}

//Negative Tests for platform register
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  const ssn = data['ssn'];
  const orgNr = data['orgNumber'];
  var res, success;

  //Test Platform: Register: Get organization by orgno and validate response to be 403
  res = register.getOrganizations(runtimeToken, orgNr);
  success = check(res, {
    'GET Org status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Test Platform: Register: Get parties by partyId and validate response to be 403
  res = register.getParty(runtimeToken, partyId);
  success = check(res, {
    'GET Party status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Test Platform: Register: POST party lookup by SSN and validate response to be 403
  res = register.postPartieslookup(runtimeToken, 'ssn', ssn);
  success = check(res, {
    'GET Party info status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformNegativeRegister')] = generateJUnitXML(data, 'platform-negative-register');
  return result;
}
