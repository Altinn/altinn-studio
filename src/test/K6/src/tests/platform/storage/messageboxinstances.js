/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run /src/tests/platform/storage/messageboxinstances.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check, sleep } from 'k6';
import * as instances from '../../../api/platform/storage/instances.js';
import * as sbl from '../../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../../setup.js';
import * as support from '../../../support.js';
import { addErrorCount } from '../../../errorcounter.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const appName = __ENV.level2app;
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
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, appName);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  var instanceId = instances.postInstance(altinnStudioRuntimeCookie, data['partyId'], appOwner, appName, instanceJson);
  instanceId = instances.findInstanceId(instanceId.body);
  data.instanceId = instanceId;
  return data;
}

//Tests for platform Storage: MessageBoxInstances
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  const instanceId = data['instanceId'];
  var res, success;

  //Test to get an instance by id from storage: SBL and validate the response
  res = sbl.getSblInstanceById(runtimeToken, partyId, instanceId);
  success = check(res, {
    'GET SBL Instance by Id status is 200': (r) => r.status === 200,
    'GET SBL Instance by Id Instance Id matches': (r) => JSON.parse(r.body).id === instanceId,
  });
  addErrorCount(success);

  //Test to get active instances based of a specific app from storage: SBL and validate the response
  var filters = {
    language: 'nb',
    appId: appOwner + '/' + appName,
    'instanceOwner.partyId': partyId,
    includeActive: 'true',
  };
  res = sbl.searchSblInstances(runtimeToken, filters);
  success = check(res, {
    'Search instances by app id status is 200': (r) => r.status === 200,
    'Search instances by app id count is more than 0': (r) => JSON.parse(r.body).length > 0,
    'Search instances only active instances retrieved': (r) => {
      var responseInstances = r.json();
      return (
        responseInstances.every((instance) => instance.archivedDateTime === null) && responseInstances.every((instance) => instance.deletedDateTime === null)
      );
    },
  });
  addErrorCount(success);

  //Test to get instances based on filter parameters: created and lastChanged from storage: SBL and validate the response
  filters = {
    'instanceOwner.partyId': partyId,
    created: 'gt:' + support.todayDateInISO(),
    lastChanged: 'lte:' + new Date().toISOString(),
  };
  res = sbl.searchSblInstances(runtimeToken, filters);
  success = check(res, {
    'Search instances by date filters status is 200': (r) => r.status === 200,
    'Search instances Created date is greaten than today': (r) => {
      var responseInstances = r.json();
      return responseInstances.every((instance) => instance.createdDateTime > support.todayDateInISO());
    },
  });
  addErrorCount(success);

  //Test to get instances based on filter parameters: search string (app title) from storage: SBL and validate the response
  filters = {
    'instanceOwner.partyId': partyId,
    searchString: 'app',
    language: 'nb',
  };
  res = sbl.searchSblInstances(runtimeToken, filters);
  success = check(res, {
    'Search instances by app title status is 200': (r) => r.status === 200,
    'Search instances app title matches': (r) => {
      var responseInstances = r.json();
      return responseInstances.every((instance) => instance.title.includes('app'));
    },
  });
  addErrorCount(success);

  //Test to soft delete an instance from storage: SBL and validate the response
  res = sbl.deleteSblInstance(runtimeToken, partyId, instanceId, 'false');
  success = check(res, {
    'Soft DELETE instance status is 200': (r) => r.status === 200,
    'Soft DELETE instance Response is true': (r) => r.body === 'true',
  });
  addErrorCount(success);
  sleep(3);

  //Test to restore a soft deleted instance from storage: SBL and validate the response
  res = sbl.restoreSblInstance(runtimeToken, partyId, instanceId);
  success = check(res, {
    'Restore Soft deleted instance Status is 200': (r) => r.status === 200,
    'Restore Soft deleted instance Response is true': (r) => r.body === 'true',
  });
  addErrorCount(success);
  sleep(3);

  //Test to get an instance events from storage: SBL and validate the response
  res = sbl.getSblInstanceEvents(runtimeToken, partyId, instanceId);
  success = check(res, {
    'GET SBL Instance Events status is 200': (r) => r.status === 200,
    'GET SBL Instance Events Events Counts matches': (r) => JSON.parse(r.body).length === 3,
  });
  addErrorCount(success);

  //Test to hard delete an instance from storage: SBL and validate the response
  res = sbl.deleteSblInstance(runtimeToken, partyId, instanceId, 'true');
  success = check(res, {
    'Hard DELETE instance status is 200': (r) => r.status === 200,
    'Hard DELETE instance Response is true': (r) => r.body === 'true',
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformStorageSbl')] = generateJUnitXML(data, 'platform-storage-sbl');
  return result;
}
