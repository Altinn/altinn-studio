/*
  Create and archive instances of T3.0 apps with attachment component and simulate all the api calls from portal
  example: k6 run -i 20 --duration 1m /src/tests/app/portalsimulation.js 
  -e env=test -e org=ttd -e level2app=apps-test -e appsaccesskey=*** -e sblaccesskey=*** -e username=*** -e userpwd=***
*/

import { check } from 'k6';
import { addErrorCount, stopIterationOnFail } from '../../errorcounter.js';
import * as appInstances from '../../api/app/instances.js';
import * as appData from '../../api/app/data.js';
import * as appProcess from '../../api/app/process.js';
import * as platformInstances from '../../api/platform/storage/instances.js';
import * as platformApps from '../../api/platform/storage/applications.js';
import * as setUpData from '../../setup.js';
import * as appInstantiation from '../../api/app/instantiation.js';
import * as appResources from '../../api/app/resources.js';
import { generateJUnitXML, reportPath } from '../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;

let instanceFormDataXml = open('../../data/' + level2App + '.xml');
let pdfAttachment = open('../../data/test_file_pdf.pdf', 'b');
let bigAttachment = open('../../data/test_file_morethan_1mb.txt', 'b');

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  return data;
}

//Tests for App API : Portal simulation
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  const partyId = data['partyId'];
  var instanceId, dataId, res, success, attachmentDataType, isReceiptPdfGenerated;

  //Batch api calls before creating an app instance
  res = appInstantiation.beforeInstanceCreation(runtimeToken, partyId, appOwner, level2App);
  for (var i = 0; i < res.length; i++) {
    success = check(res[i], {
      'Batch request before app Instantiation': (r) => r.status === 200,
    });
    addErrorCount(success);
    stopIterationOnFail('Batch request before app Instantiation', success, res[i]);
  }

  attachmentDataType = platformApps.findAttachmentDataType(res[1].body);

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

  //Test to get the current process of an app instance
  res = appProcess.getCurrentProcess(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'Get Current process of instance': (r) => r.status === 200,
  });
  addErrorCount(success);
  stopIterationOnFail('Get Current process of instance', success, res);

  //Test to get the form data xml by id
  res = appData.getDataById(runtimeToken, partyId, instanceId, dataId, appOwner, level2App);
  success = check(res, {
    'Get form data XML by id': (r) => r.status === 200,
  });
  addErrorCount(success);
  stopIterationOnFail('Get form data XML by id', success, res);

  //Batch request to get the app resources
  res = appResources.batchGetAppResources(runtimeToken, appOwner, level2App);
  for (var i = 0; i < res.length; i++) {
    success = check(res[i], {
      'Batch request to get app resources': (r) => r.status === 200,
    });
    addErrorCount(success);
    stopIterationOnFail('Batch request to get app resources', success, res[i]);
  }

  //Test to get validate instance and verify response code to have error "TooFewDataElementsOfType"
  res = appInstances.getValidateInstance(runtimeToken, partyId, instanceId, appOwner, level2App, appOwner, level2App);
  success = check(res, {
    'E2E App GET Validate Instance response has TooFewDataElementsOfType': (r) => JSON.parse(r.body)[0].code === 'TooFewDataElementsOfType',
  });
  addErrorCount(success);

  //Test to edit a form data in an instance with App APi and validate the response
  res = appData.putDataById(runtimeToken, partyId, instanceId, dataId, null, instanceFormDataXml, appOwner, level2App);
  success = check(res, {
    'E2E PUT Edit Data by Id status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E PUT Edit Data by Id', success, res);

  //upload a big attachment to an instance with App API
  res = appData.postData(runtimeToken, partyId, instanceId, attachmentDataType, bigAttachment, 'txt', appOwner, level2App);

  dataId = JSON.parse(res.body).id;

  //Test to get validate instance attachment data and verify response code to have error "DataElementTooLarge"
  res = appData.getValidateInstanceData(runtimeToken, partyId, instanceId, dataId, appOwner, level2App);
  success = check(res, {
    'E2E App GET Validate InstanceData response has DataElementTooLarge': (r) => JSON.parse(r.body)[0].code === 'DataElementTooLarge',
  });
  addErrorCount(success);

  //delete the big attachment from an instance with App API
  appData.deleteDataById(runtimeToken, partyId, instanceId, dataId, appOwner, level2App);

  //upload a valid attachment to an instance with App API
  res = appData.postData(runtimeToken, partyId, instanceId, attachmentDataType, pdfAttachment, 'pdf', appOwner, level2App);
  success = check(res, {
    'E2E POST Upload Data status is 201': (r) => r.status === 201,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E POST Upload Data', success, res);

  //Test to get validate instance and verify that validation of instance is ok
  res = appInstances.getValidateInstance(runtimeToken, partyId, instanceId, appOwner, level2App);
  success = check(res, {
    'E2E App GET Validate Instance validation OK': (r) => r.body && JSON.parse(r.body).length === 0,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E App GET Validate Instance is not OK', success, res);

  //Test to move the process of an app instance to the next process element and verify response code to be 200
  res = appProcess.putNextProcess(runtimeToken, partyId, instanceId, 'EndEvent_1', appOwner, level2App);
  success = check(res, {
    'E2E App PUT Move process to Next element status is 200': (r) => r.status === 200,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E App PUT Move process to Next element', success, res);

  //Test to call get instance details and verify the presence of archived date
  res = appInstances.getInstanceById(runtimeToken, partyId, instanceId, appOwner, level2App);
  isReceiptPdfGenerated = appInstances.isReceiptPdfGenerated(res.body);
  success = check(res, {
    'E2E App Instance is archived': (r) => r.body.length > 0 && JSON.parse(r.body).status.archived != null,
    'E2E Receipt pdf is generated': (r) => isReceiptPdfGenerated === true,
  });
  addErrorCount(success);
  stopIterationOnFail('E2E App Instance is not archived', success, res);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('portal-simulation')] = generateJUnitXML(data, 'portal-simulation');
  return result;
}
