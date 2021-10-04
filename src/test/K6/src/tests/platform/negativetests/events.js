/* 
    Negative test script to platform events api with user token
    Command: docker-compose run k6 run /src/tests/platform/negativetests/events.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=***
*/
import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as events from '../../../api/platform/events/events.js';
import * as appInstances from '../../../api/app/instances.js';
import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const appName = __ENV.level2app;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
};

//Function to setup data and return userData
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, appName);
  setUpData.clearCookies();
  var instance = appInstances.postInstance(altinnStudioRuntimeCookie, data['partyId'], appOwner, appName);
  data.instanceId = JSON.parse(instance.body).id;
  data.RuntimeToken = altinnStudioRuntimeCookie;
  return data;
}

//Negative Test for platform events
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  var res, success;

  //Test to post events and assert that response is 403
  res = events.postEvents(runtimeToken);
  success = check(res, {
    'POST Events status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Test to get events api by org and app name and check that a person cannot use the api
  res = events.getEvents(runtimeToken, appOwner, appName, null);
  success = check(res, {
    'GET Todays Events by org app name status is 401': (r) => r.status === 401,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformNegativeEvents')] = generateJUnitXML(data, 'platform-negative-Events');
  return result;
}
