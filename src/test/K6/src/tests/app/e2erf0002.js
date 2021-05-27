/*
  Create and archive instances of RF-0002 without attachments
  Test data: a json file named as ex: users_prod.json with user data in below format in the K6/src/data folder and deployed RF-0002 app
  [
    {
        "username": "",
        "password": "",
        "partyid": ""
    }
  ]
  example: k6 run -i 20 --duration 1m --logformat raw --console-output=./src/data/instances.csv src/tests/app/e2erf0002.js 
  -e env=test -e org=ttd -e level2app=rf-0002 -e appsaccesskey=*** -e archive=true -e delete=true -e harddelete=true
*/

import { check } from 'k6';
import { addErrorCount, stopIterationOnFail } from '../../errorcounter.js';
import * as appInstances from '../../api/app/instances.js';
import * as appData from '../../api/app/data.js';
import * as appProcess from '../../api/app/process.js';
import * as platformInstances from '../../api/platform/storage/instances.js';
import { deleteSblInstance } from '../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../setup.js';

const appOwner = __ENV.org;
const level2App = __ENV.level2app;
const environment = __ENV.env.toLowerCase();
const fileName = 'users_' + environment + '.json';
const toArchive = __ENV.archive ? __ENV.archive.toLowerCase() : 'true';
const toDelete = __ENV.delete ? __ENV.delete.toLowerCase() : 'true';
const hardDelete = __ENV.harddelete ? __ENV.harddelete.toLowerCase() : 'true';

let instanceFormDataXml = open('../../data/' + level2App + '.xml');
let users = JSON.parse(open('../../data/' + fileName));
const usersCount = users.length;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
};

//Tests for App API: RF-0002
export default function () {
  var userNumber = (__VU - 1) % usersCount;
  var instanceId, dataId, res, success;

  try {
    var userSSN = users[userNumber].username;
    var userPwd = users[userNumber].password;
  } catch (error) {
    stopIterationOnFail('Testdata missing', false, null);
  }

  var aspxauthCookie = setUpData.authenticateUser(userSSN, userPwd);
  const runtimeToken = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  setUpData.clearCookies();
  const partyId = users[userNumber].partyid;

  //Test to create an instance with App api and validate the response
  res = appInstances.postInstance(runtimeToken, partyId, appOwner, level2App);
  success = check(res, {
    'E2E App POST Create Instance status is 201:': (r) => r.status === 201,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E App POST Create Instance:', success, res);

  try {
    dataId = appData.findDataId(res.body);
    instanceId = platformInstances.findInstanceId(res.body);
  } catch (error) {
    stopIterationOnFail('Instance id and data id not retrieved:', false, null);
  }

  //Test to edit a form data in an instance with App APi and validate the response
  res = appData.putDataById(runtimeToken, partyId, instanceId, dataId, 'default', instanceFormDataXml, appOwner, level2App);
  success = check(res, {
    'E2E PUT Edit Data by Id status is 201:': (r) => r.status === 201,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E PUT Edit Data by Id:', success, res);

  //Test to get validate instance and verify that validation of instance is ok
  res = appInstances.getValidateInstance(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'E2E App GET Validate Instance validation OK:': (r) => r.body && JSON.parse(r.body).length === 0,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E App GET Validate Instance is not OK:', success, res);

  if (toArchive == 'true') {
    //Test to get next process of an app instance again and verify response code  to be 200
    res = appProcess.getNextProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
    success = check(res, {
      'E2E App GET Next process element id:': (r) => r.status === 200,
    });
    addErrorCount(success);
    stopIterationOnFail('Unable to get next element id:', success, res);
    var nextElement = JSON.parse(res.body)[0];

    //Test to move the process of an app instance to the next process element and verify response code to be 200
    res = appProcess.putNextProcess(runtimeToken, partyId, instanceId, nextElement, appOwner, level2App);
    success = check(res, {
      'E2E App PUT Move process to Next element status is 200:': (r) => r.status === 200,
    });
    addErrorCount(success);
    stopIterationOnFail('E2E App PUT Move process to Next element:', success, res);

    //Test to call get instance details and verify the presence of archived date
    res = appInstances.getInstanceById(runtimeToken, partyId, instanceId, appOwner, level2App);
    success = check(res, {
      'E2E App Instance is archived:': (r) => r.body.length > 0 && JSON.parse(r.body).status.archived != null,
    });
    addErrorCount(success);
    stopIterationOnFail('E2E App Instance is not archived:', success, res);
  }

  //hard delete or soft delete an instance if delete flag is set
  if (toDelete == 'true') deleteSblInstance(runtimeToken, partyId, instanceId, hardDelete);

  /* write the instance id to console which can be written to a file using --console-output and logformat raw
    for appowner tests. */
  console.log(partyId + '/' + instanceId);
}
