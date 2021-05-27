/* 
    Test script to platform events/subscriptions api with user token
    Command: docker-compose run k6 run /src/tests/platform/events/subscriptions.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=***
*/
import { check } from 'k6';
import { addErrorCount, stopIterationOnFail } from '../../../errorcounter.js';
import * as subscriptions from '../../../api/platform/events/subscriptions.js';
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
  data.RuntimeToken = altinnStudioRuntimeCookie;
  return data;
}

//Test for platform events/subscriptions and validate response
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const ssn = data['ssn'];
  var res, success, subscriptionId;

  res = subscriptions.postSubscriptions(runtimeToken, ssn, 'person', appOwner, appName);
  success = check(res, {
    'POST create event subscription - status is 201': (r) => r.status === 201,
    'Created event subscription Id is not null': (r) => r.json('id') != null,
  });
  addErrorCount(success);
  stopIterationOnFail('Create event subscription', success, res);

  try {
    subscriptionId = res.json('id');
  } catch (error) {
    stopIterationOnFail('Subscription id not found', false, null);
  }

  res = subscriptions.getSubscriptionById(runtimeToken, subscriptionId);
  success = check(res, {
    'GET event subscription by id - status is 200': (r) => r.status === 200,
    'GET event subscription by id - id matches': (r) => r.json('id') == subscriptionId,
  });
  addErrorCount(success);

  res = subscriptions.deleteSubscriptionById(runtimeToken, subscriptionId);
  success = check(res, {
    'DELETE event subscription by id - status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('subscriptions')] = generateJUnitXML(data, 'platform-events-subscription');
  return result;
}
