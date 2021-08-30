/*
  This test script can only be run with virtual users and iterations count and not based on duration.
  Create and archive instances of RF-0002 with attachments, where the distribution of attachments is based on 
  parameter attachmentdistribution among small, medium and large attachment.

  example: k6 run -i 20 -u 10 --logformat raw --console-output=./src/data/instances.csv 
  /src/tests/app/rf0002withattachment.js -e env=test -e org=ttd -e level2app=rf-0002 -e appsaccesskey=*** -e attachmentdistribution="60;30;10"

   Test data: a json file named as ex: users_prod.json with user data in below format in the K6/src/data folder and deployed RF-0002 app
  [
	{
		"username": "",
		"password": "",
		"partyid": ""
    }
  ]
  After archiving the instance download the instance data as instanceOwner
*/

import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { addErrorCount, stopIterationOnFail } from '../../../errorcounter.js';
import * as appInstances from '../../../api/app/instances.js';
import * as appData from '../../../api/app/data.js';
import * as appProcess from '../../../api/app/process.js';
import * as platformInstances from '../../../api/platform/storage/instances.js';
import * as apps from '../../../api/platform/storage/applications.js';
import * as storageData from '../../../api/platform/storage/data.js';
import { deleteSblInstance } from '../../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../../setup.js';

const instanceFormDataXml = open('../../../data/' + level2App + '.xml');
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
const environment = __ENV.env.toLowerCase();
const fileName = 'users_' + environment + '.json';

var attachmentDistribution = __ENV.attachmentdistribution;
const smallAttachment = open('../../../data/50kb.txt');
const mediumAttachment = open('../../../data/1mb.txt');
const largeAttachment = open('../../../data/99mb.txt');
let users = new SharedArray('test users', function () {
  var usersArray = JSON.parse(open('../../../data/' + fileName));
  return usersArray;
});
const usersCount = users.length;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//setup functions creates an array of attachment data based on the distribution percentage and total iteration count
export function setup() {
  var data = {};
  var totalIterations = options.iterations ? options.iterations : 1;
  var maxVus = options.vus ? options.vus : 1;
  data.maxIter = Math.floor(totalIterations / maxVus); //maximum iteration per vu
  attachmentDistribution = attachmentDistribution ? attachmentDistribution : '';
  let attachmentTypes = setUpData.buildAttachmentTypeArray(attachmentDistribution, totalIterations);
  data.attachmentTypes = attachmentTypes;
  return data;
}

//Tests for App API: RF-0002
export default function (data) {
  var userNumber = (__VU - 1) % usersCount;
  var maxIter = data.maxIter;
  var attachmentTypes = data.attachmentTypes[0] ? data.attachmentTypes : ['s'];
  var instanceId, dataId, res, success;

  //Find a unique number for the type of attachment to upload
  var uniqueNum = __VU * maxIter - maxIter + __ITER;
  uniqueNum = uniqueNum > attachmentTypes.length ? Math.floor(uniqueNum % attachmentTypes.length) : uniqueNum;

  //Find a username and password from the users file
  try {
    var userSSN = users[userNumber].username;
    var userPwd = users[userNumber].password;
  } catch (error) {
    stopIterationOnFail('Testdata missing', false, null);
  }

  var aspxauthCookie = setUpData.authenticateUser(userSSN, userPwd);
  const runtimeToken = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  setUpData.clearCookies();

  //Get App metadata and find attachchment data guid id
  var attachmentDataType = apps.getAppByName(runtimeToken, appOwner, level2App);
  success = check(attachmentDataType, {
    'GET App Metadata': (r) => r.status === 200,
  });
  addErrorCount(success);
  stopIterationOnFail('GET App Metadata Failed', success, attachmentDataType);

  attachmentDataType = apps.findAttachmentDataType(attachmentDataType.body);
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

  //dynamically assign attachments - based on the value from the array holding the attachment type
  var attachment = attachmentTypes[uniqueNum] === 's' ? smallAttachment : attachmentTypes[uniqueNum] === 'm' ? mediumAttachment : largeAttachment;

  //upload a upload attachment to an instance with App API
  res = appData.postData(runtimeToken, partyId, instanceId, attachmentDataType, attachment, 'txt', appOwner, level2App);
  success = check(res, {
    'E2E POST upload attachment Data status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E POST upload attachment Data status', success, res);

  //Test to get validate instance and verify that validation of instance is ok
  res = appInstances.getValidateInstance(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'E2E App GET Validate Instance validation OK': (r) => r.body && JSON.parse(r.body).length === 0,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E App GET Validate Instance is not OK', success, res);

  //Test to get next process of an app instance again and verify response code  to be 200
  res = appProcess.getNextProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'E2E App GET Next process element id': (r) => r.status === 200,
  });
  addErrorCount(success);
  stopIterationOnFail('Unable to get next element id', success, res);
  var nextElement = JSON.parse(res.body)[0];

  //Test to move the process of an app instance to the next process element and verify response code to be 200
  res = appProcess.putNextProcess(runtimeToken, partyId, instanceId, nextElement, appOwner, level2App);
  success = check(res, {
    'E2E App PUT Move process to Next element status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E App PUT Move process to Next element', success, res);

  //Test to call get instance details and verify the presence of archived date
  res = appInstances.getInstanceById(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'E2E App Instance is archived': (r) => JSON.parse(r.body).status.archived != null,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E App Instance is not archived', success, res);

  deleteSblInstance(runtimeToken, partyId, instanceId, 'true');

  try {
    var dataElements = JSON.parse(res.body).data;
  } catch (error) {
    stopIterationOnFail('DataElements not retrieved', false, null);
  }

  //Loop through the dataelements under an instance and download instance
  for (var i = 0; i < dataElements.length; i++) {
    res = storageData.getData(runtimeToken, partyId, instanceId, dataElements[i].id);
    success = check(res, {
      'Instance Data is downloaded': (r) => r.status === 200,
    });
    addErrorCount(success);
    stopIterationOnFail('Instance Data is not downloaded', success, res);
  }

  /* write the instance id to console which can be written to a file using --console-output and logformat raw
    for appowner tests. */
  console.log(partyId + '/' + instanceId);
}
