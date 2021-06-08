/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run src/tests/platform/storage/events.js -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=***
*/

import { check } from 'k6';
import * as instances from '../../../api/platform/storage/instances.js';
import * as events from '../../../api/platform/storage/events.js';
import * as sbl from '../../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../../setup.js';
import { addErrorCount } from '../../../errorcounter.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
let eventsJson = open('../../../data/events.json');
let instanceJson = open('../../../data/instance.json');

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return AltinnstudioRuntime Token, instance and user details
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  var instanceId = instances.postInstance(altinnStudioRuntimeCookie, data['partyId'], appOwner, level2App, instanceJson);
  instanceId = instances.findInstanceId(instanceId.body);
  data.instanceId = instanceId;
  return data;
}

//Tests for platform Storage: Instance Events
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  const instanceId = data['instanceId'];
  var eventId = '';
  var res, success;

  //Test to add an instance event to an instance with storage api and validate the response
  res = events.postAddEvent(runtimeToken, partyId, instanceId, eventsJson);
  success = check(res, {
    'POST Add Event status is 201': (r) => r.status === 201,
    'POST Add Event Event Id is not null': (r) => JSON.parse(r.body).id != null,
  });
  addErrorCount(success);

  eventId = JSON.parse(res.body).id;

  //Test to get an instance event by id from an instance with storage api and validate the response
  res = events.getEvent(runtimeToken, partyId, instanceId, eventId);
  success = check(res, {
    'GET Instance Event status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test to get all instance events from an instance with storage api and validate the response
  res = events.getAllEvents(runtimeToken, partyId, instanceId);
  success = check(res, {
    'GET All Instance Events status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test to get all instance events by type from an instance with storage api and validate the response
  res = events.getEventByType(runtimeToken, partyId, instanceId, 'created');
  success = check(res, {
    'GET Instance Events by EventType status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);
}

//Delete the instance created
export function teardown(data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  const instanceId = data['instanceId'];

  sbl.deleteSblInstance(runtimeToken, partyId, instanceId, 'true');
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformStorageEvents')] = generateJUnitXML(data, 'platform-storage-events');
  return result;
}
