/* 
  This test requires an user name and password and an app
  command to run the test: docker-compose run k6 run /src/tests/app/negativetests/withoutauthentication.js 
  -e env=*** -e org=*** -e level2app=*** -e username=*** -e userpwd=*** 
*/

import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as appInstances from '../../../api/app/instances.js';
import * as appData from '../../../api/app/data.js';
import * as platformInstances from '../../../api/platform/storage/instances.js';
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
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  var instanceId = appInstances.postInstance(altinnStudioRuntimeCookie, data['partyId'], appOwner, level2App);
  var dataId = appData.findDataId(instanceId.body);
  instanceId = platformInstances.findInstanceId(instanceId.body);
  data.instanceId = instanceId;
  data.dataId = dataId;
  return data;
}

//Negative tests towards to app apis without authentication and expect the response code to be 401
export default function (data) {
  const partyId = data['partyId'];
  const instanceId = data['instanceId'];
  const dataId = data['dataId'];
  var res, success;

  //Test to create an instance without authentication and expect 401
  res = appInstances.postInstance(null, partyId, appOwner, level2App);
  success = check(res, {
    'App POST Create Instance status is 401': (r) => r.status === 401,
  });
  addErrorCount(success);

  //Test to Get instance data by id with App api and validate the response
  var res = appData.getDataById(null, partyId, instanceId, dataId, appOwner, level2App);
  var success = check(res, {
    'App GET Data by Id status is 401': (r) => r.status === 401,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('negativeWithoutAuthN')] = generateJUnitXML(data, 'app-negativeWithoutAuthN');
  return result;
}
