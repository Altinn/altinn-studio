/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run /src/tests/platform/register/register.js 
    -e env=*** -e org=*** -e level2app=*** -e username=*** -e userpwd=*** -e appsaccesskey=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as setUpData from '../../../setup.js';
import * as appInstances from '../../../api/app/instances.js';
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

//Tests for platform register
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const ssn = data['ssn'];
  const orgNr = data['orgNumber'];
  var res, success;

  //Test regiter party lookup indirectly by creating an instance with app api and ssn details
  res = appInstances.postCreateInstanceWithSsnOrOrg(runtimeToken, 'ssn', ssn, appOwner, level2App);
  success = check(res, {
    'Instance created by looking up SSN in register': (r) => r.status === 201,
  });
  addErrorCount(success);

  //Test regiter party lookup indirectly by creating an instance with app api and ssn details
  res = appInstances.postCreateInstanceWithSsnOrOrg(runtimeToken, 'org', orgNr, appOwner, level2App);
  success = check(res, {
    'Instance created by looking up Org in register': (r) => r.status === 201,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformRegister')] = generateJUnitXML(data, 'platform-register');
  return result;
}
