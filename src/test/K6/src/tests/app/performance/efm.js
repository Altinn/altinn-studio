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
  example: k6 run -i 20 --duration 1m --logformat raw --console-output=./src/data/instances.csv src/tests/app/efm.js
  -e appsaccesskey=*** -e archive=true -e delete=false -e harddelete=true
*/

import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { addErrorCount, stopIterationOnFail } from '../../../errorcounter.js';
import * as appInstances from '../../../api/app/instances.js';
import * as appData from '../../../api/app/data.js';
import * as appProcess from '../../../api/app/process.js';
import * as platformInstances from '../../../api/platform/storage/instances.js';
import { deleteSblInstance } from '../../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../../setup.js';

const appOwner = 'ttd';
const level2App = 'eformidling-app';
const environment = 'tt02';
const fileName = 'users_' + environment + '.json';
const toDelete = __ENV.delete ? __ENV.delete.toLowerCase() : 'true';
const hardDelete = __ENV.harddelete ? __ENV.harddelete.toLowerCase() : 'true';

let pdfAttachment = open('../../../data/test_file_pdf.pdf', 'b');
let instanceFormDataXml = open('../../../data/' + level2App + '.xml');
let users = new SharedArray('test users', function () {
  var usersArray = JSON.parse(open('../../../data/' + fileName));
  return usersArray;
});
const usersCount = users.length;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
};

//Tests for App API: eFormidling-app
export default function () {
  var userNumber = (__VU - 1) % usersCount;
  var instanceId, dataId, res, success;
  const attachmentDataType = '9dd34a1e-e9f5-4f64-ab47-3a1a4a362e92';

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
    'E2E App POST Create Instance status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E App POST Create Instance', success, res);

  try {
    dataId = appData.findDataId(res.body);
    instanceId = platformInstances.findInstanceId(res.body);
  } catch (error) {
    stopIterationOnFail('Instance id and data id not retrieved', false, null);
  }

  //Test to edit a form data in an instance with App APi and validate the response
  res = appData.putDataById(runtimeToken, partyId, instanceId, dataId, null, instanceFormDataXml, appOwner, level2App);
  success = check(res, {
    'E2E PUT Edit Data by Id status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E PUT Edit Data by Id', success, res);

  //upload a valid attachment to an instance with App API
  res = appData.postData(runtimeToken, partyId, instanceId, attachmentDataType, pdfAttachment, 'pdf', appOwner, level2App);

  //Test to complete process of an app instance again and verify response code to be 200
  res = appProcess.putCompleteProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'E2E App GET Next process element id': (r) => r.status === 200,
  });
  addErrorCount(success);
  stopIterationOnFail('Unable to get next element id', success, res);

  //Test to complete process of an app instance again and verify response code to be 200
  res = appProcess.putCompleteProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'E2E App GET Next process element id': (r) => r.status === 200,
  });
  addErrorCount(success);
  stopIterationOnFail('Unable to get next element id', success, res);

  //Test to call get instance details and verify the presence of archived date
  res = appInstances.getInstanceById(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'E2E App Instance is archived': (r) => r.body.length > 0 && JSON.parse(r.body).status.archived != null,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E App Instance is not archived', success, res);

  //hard delete or soft delete an instance if delete flag is set
  if (toDelete == 'true') deleteSblInstance(runtimeToken, partyId, instanceId, hardDelete);

  /* write the instance id to console which can be written to a file using --console-output and logformat raw
    for appowner tests. */
  console.log(partyId + '/' + instanceId);
}
