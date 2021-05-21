/* 
  This test requires two user names and password and an app
  command to run the test: docker-compose run k6 run /src/tests/app/negativetests/withoutallowedroles.js 
  -e env=*** -e org=*** -e level1app=*** -e username=*** -e userpwd=*** -e level1user=*** -e appsaccesskey=***
*/

import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as appInstances from '../../../api/app/instances.js';
import * as platformInstances from '../../../api/platform/storage/instances.js';
import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const level1UserName = __ENV.level1user;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level1App = __ENV.level1app;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup Login to user 1 and create an instance and login to user 2 to get the cookie values
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level1App);
  setUpData.clearCookies();
  var instanceId = appInstances.postInstance(altinnStudioRuntimeCookie, data['partyId'], appOwner, level1App);
  instanceId = platformInstances.findInstanceId(instanceId.body);
  data.instanceId = instanceId;
  aspxauthCookie = setUpData.authenticateUser(level1UserName, userPassword);
  altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  return data;
}

//Negative tests towards to app apis without required roles
export default function (data) {
  var partyId = data['partyId'];
  const runtimeToken = data['RuntimeToken'];
  var instanceId = data['instanceId'];
  var res, success;

  //Test to create an instance without required roles and expecting 403
  res = appInstances.postInstance(runtimeToken, partyId, appOwner, level1App);
  success = check(res, {
    'App POST Create Instance status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Test to get an instance without required roles and expecting 403
  res = appInstances.getInstanceById(runtimeToken, partyId, instanceId, appOwner, level1App);
  success = check(res, {
    'App GET Instance by Id status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('negativeWithoutAllowedRoles')] = generateJUnitXML(data, 'app-negativeWithoutAllowedRoles');
  return result;
}
