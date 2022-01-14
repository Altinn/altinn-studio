/* 
  Test data required: username, password, app requiring level 2 login (reference app: ttd/apps-test)
  command to run the test: docker-compose run k6 run /src/tests/app/instances.js 
  -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check } from 'k6';
import { addErrorCount, stopIterationOnFail } from '../../errorcounter.js';
import * as appInstances from '../../api/app/instances.js';
import * as platformInstances from '../../api/platform/storage/instances.js';
import { deleteSblInstance } from '../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../setup.js';
import { generateJUnitXML, reportPath } from '../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const appName = __ENV.level2app;

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
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, appName);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  return data;
}

//Tests for App Api: Instances
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  var instanceId = '';
  var res, success, instanceJson, instanceInfo, filters;

  //Test to create an instance with App api and validate the response
  res = appInstances.postInstance(runtimeToken, partyId, appOwner, appName);
  success = check(res, {
    'App POST Create Instance status is 201': (r) => r.status === 201,
    'App POST Create Instance Instace Id is not null': (r) => JSON.parse(r.body).id != null,
  });
  addErrorCount(success);
  instanceJson = res.body;
  if (JSON.parse(instanceJson).id != null) {
    instanceId = platformInstances.findInstanceId(instanceJson);
  }

  //Test to get an instance by id with App api and validate the response
  res = appInstances.getInstanceById(runtimeToken, partyId, instanceId, appOwner, appName);
  success = check(res, {
    'App GET Instance by Id status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);

  //Test to get all active instances of an app for a partyid
  res = appInstances.getActiveInstances(runtimeToken, partyId, appOwner, appName);
  success = check(res, {
    'GET all active instances of an app - status is 200': (r) => r.status === 200,
    'GET all active instances of an app - count greater than 0': (r) => r.json().length > 0,
  });
  addErrorCount(success);

  deleteSblInstance(runtimeToken, partyId, instanceId, 'true');

  //Test to create an instance using simplified instantiation and validate the response
  instanceInfo = {
    instanceOwner: {
      partyId: partyId.toString(),
    },
    prefill: {
      email: 'test@test.com',
    },
  };
  res = appInstances.postSimplifiedInstantiation(runtimeToken, appOwner, appName, instanceInfo);
  success = check(res, {
    'Simplified instantiation - status is 201': (r) => r.status === 201,
    'Simplified instantiation - Instace Id is not null': (r) => JSON.parse(r.body).id != null,
  });
  addErrorCount(success);
  instanceJson = res.body;
  if (JSON.parse(instanceJson).id != null) {
    instanceId = platformInstances.findInstanceId(instanceJson);
  }

  //Copy of an active instance will fail
  instanceInfo = {
    instanceOwner: {
      partyId: partyId.toString(),
    },
    sourceInstanceId: `${partyId}/${instanceId}`,
  };
  res = appInstances.postSimplifiedInstantiation(runtimeToken, appOwner, appName, instanceInfo);
  success = check(res, {
    'Copy active instance - status is 400': (r) => r.status === 400,
  });
  addErrorCount(success);

  deleteSblInstance(runtimeToken, partyId, instanceId, 'true');

  //Get an archived instance for copying
  let d = new Date();
  d.setDate(d.getDate() - 3);
  filters = {
    'instanceOwner.partyId': partyId,
    'status.isArchived': true,
    'status.isHardDeleted': true,
    appId: `${appOwner}/${appName}`,
    created: `gte:${d.toISOString()}`,
  };
  res = platformInstances.getAllinstancesWithFilters(runtimeToken, filters);

  if (!res.json('instances').length > 0) {
    stopIterationOnFail('No archived instances found', false, null);
  }

  instanceId = res.json('instances')[0].id.split('/')[1];

  //Copy of an archived instance data
  instanceInfo = {
    instanceOwner: {
      partyId: partyId.toString(),
    },
    sourceInstanceId: `${partyId}/${instanceId}`,
  };
  res = appInstances.postSimplifiedInstantiation(runtimeToken, appOwner, appName, instanceInfo);
  success = check(res, {
    'Copy an archived instance - status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);

  if (res.json('id') != null) {
    instanceId = platformInstances.findInstanceId(res.body);
  }

  deleteSblInstance(runtimeToken, partyId, instanceId, 'true');
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('appInstances')] = generateJUnitXML(data, 'app-Instances');
  return result;
}
