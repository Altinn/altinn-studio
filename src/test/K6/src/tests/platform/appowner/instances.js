/* 
    Pre-reqisite for test: 
    1. MaskinPorteTokenGenerator https://github.com/Altinn/MaskinportenTokenGenerator built
    2. Installed appOwner certificate
    3. Send maskinporten token as environment variable: -e maskinporten=token

    Environment variables for test environments: 
    -e tokengenuser=*** -e tokengenuserpwd=*** -e scopes=altinn:serviceowner/instances.read

    This test script is to create instance of an app as an appowner for a party id
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test) to find the party id of the user to create an instance
    and maskinporten token
    
    Command: docker-compose run k6 run /src/tests/platform/appowner/instances.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e maskinporten=token
*/

import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as instances from '../../../api/platform/storage/instances.js';
import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
let instanceJson = open('../../../data/instance.json');

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  setUpData.clearCookies();
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  altinnStudioRuntimeCookie = setUpData.getAltinnTokenForTTD();
  data.RuntimeToken = altinnStudioRuntimeCookie;
  return data;
}

//Tests for platform Storage: Instances for an appowner
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  var instanceId = '';
  var res, success;

  //Test to create an instance with storage api and validate the response that created by is an app owner
  res = instances.postInstance(runtimeToken, partyId, appOwner, level2App, instanceJson);
  success = check(res, {
    'POST Create Instance status is 201': (r) => r.status === 201,
    'POST Create Instance Instance Id is not null': (r) => JSON.parse(r.body).id != null,
  });
  addErrorCount(success);

  if (JSON.parse(res.body).id != null) {
    instanceId = instances.findInstanceId(res.body);
  }

  //Test to get an instance by id from storage and validate the response
  res = instances.getInstanceById(runtimeToken, partyId, instanceId);
  success = check(res, {
    'GET Instance by Id status is 200': (r) => r.status === 200,
    'CreatedBy of Instance is app owner': (r) => JSON.parse(r.body).createdBy.toString().length === 9,
  });
  addErrorCount(success);

  //Test to update the read status of an instance and validate the response
  res = instances.putUpdateReadStatus(runtimeToken, partyId, instanceId, 'Read');
  success = check(res, {
    'PUT Update read status is 200': (r) => r.status === 200,
    'Read status is updated as read': (r) => JSON.parse(r.body).status.readStatus === 'Read',
  });
  addErrorCount(success);

  //Test to get an instance of an app in a specific task from storage and validate the response
  var filters = {
    appId: appOwner + '/' + level2App,
    'process.currentTask': 'Task_1',
  };
  res = instances.getAllinstancesWithFilters(runtimeToken, filters);
  success = check(res, {
    'GET Instance by Current task is 200': (r) => r.status === 200,
    'Instance current task is task_1': (r) => JSON.parse(r.body).instances[0].process.currentTask.elementId === 'Task_1',
  });
  addErrorCount(success);

  //Test to get an instance of an app isArchived, isHardDeleted = false from storage and validate the response
  filters = {
    appId: appOwner + '/' + level2App,
    'status.isArchived': false,
    'status.isHardDeleted': false,
  };
  res = instances.getAllinstancesWithFilters(runtimeToken, filters);
  success = check(res, {
    'GET Instance with filters is 200': (r) => r.status === 200,
    'GET Instances isHardDeleted is false': (r) => {
      var responseInstances = r.json('instances');
      return responseInstances.every((instance) => instance.status.isHardDeleted == false);
    },
    'GET Instances isArchived is true': (r) => {
      var responseInstances = r.json('instances');
      return responseInstances.every((instance) => instance.status.isArchived == false);
    },
  });
  addErrorCount(success);

  //Test to update the sub status of an instance and validate the response
  res = instances.putUpdateSubStatus(runtimeToken, partyId, instanceId, 'test', 'test description');
  success = check(res, {
    'PUT Update sub status is 200': (r) => r.status === 200,
    'Instance sub status is updated': (r) => JSON.parse(r.body).status.substatus != null,
  });
  addErrorCount(success);

  //Test to hard delete an instance by id from storage and validate the response
  res = instances.deleteInstanceById(runtimeToken, partyId, instanceId, 'true');
  success = check(res, {
    'Hard Delete Instance by Id status is 200': (r) => r.status === 200,
    'Hard deleted date is set to instance': (r) => JSON.parse(r.body).status.hardDeleted != null,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('PlatformAppownerInstances')] = generateJUnitXML(data, 'platform-appowner-instances');
  return result;
}
