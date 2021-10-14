/*
  Create and archive instances of memo app (app with 3 task process - data, confirm and feedback)
  data, confirm - end user
  feedback - mottaks system (TE)
  test waits for time sent in wait variable (value in seconds) and verifies for insance current process and 
  downloads feedback attachment after the test knows the process is complete.

  Test data: a json file named as ex: users_prod.json with user data in below format in the K6/src/data folder and deployed memo app
  [
    {
        "username": "",
        "password": "",
        "partyid": "",
        "userid": ""
    }
  ]

  Environment variables for test environments (to get appowner token): 
  -e tokengenuser=*** -e tokengenuserpwd=*** -e scopes=altinn:serviceowner/instances.read

  example: k6 run -i 20 --duration 1m src/tests/app/memo.js 
  -e env=test -e org=ttd -e level2app=memo -e appsaccesskey=*** -e wait=10 (in seconds)
*/

import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { addErrorCount, stopIterationOnFail } from '../../../errorcounter.js';
import * as appInstances from '../../../api/app/instances.js';
import * as appData from '../../../api/app/data.js';
import * as appProcess from '../../../api/app/process.js';
import * as platformInstances from '../../../api/platform/storage/instances.js';
import { deleteSblInstance } from '../../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../../setup.js';
import { generateToken } from '../../../api/altinn-testtools/token-generator.js';

const appOwner = __ENV.org;
const appName = __ENV.level2app;
const environment = __ENV.env.toLowerCase();
const tokenGeneratorUserName = __ENV.tokengenuser;
const tokenGeneratorUserPwd = __ENV.tokengenuserpwd;
const waitForTE = parseInt(__ENV.wait);
const fileName = 'users_' + environment + '.json';

let instanceFormDataXml = open('../../../data/' + appName + '.xml');
let attachmentXml1 = open('../../../data/xml1.xml', 'b');
let pdfAttachment = open('../../../data/test_file_pdf.pdf', 'b');
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

//Tests for App API: MEMO app
export default function () {
  var userNumber = (__VU - 1) % usersCount;
  var instanceId, dataId, res, success, userSSN, partyId, userId, userToken, feedbackDataId;

  try {
    userSSN = users[userNumber].username;
    userId = users[userNumber].userid;
    partyId = users[userNumber].partyid;
  } catch (error) {
    stopIterationOnFail('Testdata missing', false, null);
  }

  group('Authentication', function () {
    var tokenGenParams = {
      env: environment,
      scopes: 'altinn:instances.read,altinn:instances.write',
      userId: userId,
      partyId: partyId,
      authLvl: 3,
      pid: userSSN,
    };
    userToken = generateToken('personal', tokenGeneratorUserName, tokenGeneratorUserPwd, tokenGenParams);
    setUpData.clearCookies();
  });

  group('Instantiate and form filling', function () {
    res = appInstances.postInstance(userToken, partyId, appOwner, appName);
    success = check(res, {
      'Create Instance - status is 201': (r) => r.status === 201,
    });
    addErrorCount(success);
    stopIterationOnFail('Create Instance', success, res);

    try {
      dataId = appData.findDataId(res.body);
      instanceId = platformInstances.findInstanceId(res.body);
    } catch (error) {
      stopIterationOnFail('Instance id and data id not retrieved', false, null);
    }

    //Update form data
    res = appData.putDataById(userToken, partyId, instanceId, dataId, null, instanceFormDataXml, appOwner, appName);
    success = check(res, {
      'Update form data - status is 201': (r) => r.status === 201,
    });
    addErrorCount(success);
    stopIterationOnFail('Update form data failed', success, res);

    //upload mvamelding
    res = appData.postData(userToken, partyId, instanceId, 'mvaMessage', attachmentXml1, 'xml', appOwner, appName);
    success = check(res, {
      'Upload mva message - status is 201': (r) => r.status === 201,
    });
    addErrorCount(success);
    stopIterationOnFail('Upload mva message failed', success, res);

    //upload a binary attachment
    res = appData.postData(userToken, partyId, instanceId, 'binaryAttachment', pdfAttachment, 'pdf', appOwner, appName);
    success = check(res, {
      'Upload binay attachment - status is 201': (r) => r.status === 201,
    });
    addErrorCount(success);
    stopIterationOnFail('Upload binay attachment failed', success, res);
  });

  group('Confirmation stage', function () {
    res = appInstances.getValidateInstance(userToken, partyId, instanceId, appOwner, appName);
    success = check(res, {
      'Validate Instance validation OK': (r) => r.body && JSON.parse(r.body).length === 0,
    });
    addErrorCount(success);
    stopIterationOnFail('Validate Instance validation NOT OK', success, res);

    //Move instance to confirm stage
    res = appProcess.putNextProcess(userToken, partyId, instanceId, null, appOwner, appName);
    success = check(res, {
      'Move process to Confirm stage - status is 200': (r) => r.status === 200,
    });
    addErrorCount(success);
    stopIterationOnFail('Move process to Confirm stage failed', success, res);

    res = appInstances.getInstanceById(userToken, partyId, instanceId, appOwner, appName);
    success = check(res, {
      'GET instance by id in confirmation - status is 200': (r) => r.status === 200,
    });
    addErrorCount(success);
    stopIterationOnFail('GET instance by id in confirmation failed', success, res);
  });

  group('Feedback stage', function () {
    res = appInstances.getValidateInstance(userToken, partyId, instanceId, appOwner, appName);
    success = check(res, {
      'Validate Instance in confirm stage validation OK': (r) => r.body && JSON.parse(r.body).length === 0,
    });
    addErrorCount(success);
    stopIterationOnFail('Validate Instance in confirm stage validation OK', success, res);

    //Move instance to feedback stage
    res = appProcess.putNextProcess(userToken, partyId, instanceId, null, appOwner, appName);
    success = check(res, {
      'Move process to Feedback stage - status is 200': (r) => r.status === 200,
    });
    addErrorCount(success);
    stopIterationOnFail('Move process to Feedback stage failed', success, res);

    if (waitForTE != null && waitForTE > 0) {
      var sleptSeconds = 0;
      var stepSleepCounter = 1;
      for (var i = 1; i <= 10; i++) {
        sleep(stepSleepCounter);
        res = appProcess.getCurrentProcess(userToken, partyId, instanceId, appOwner, appName);
        success = check(res, {
          'Get Current process - status is 200': (r) => r.status === 200,
        });
        addErrorCount(success);
        if (res.json('ended') != null) break;

        sleptSeconds = sleptSeconds + stepSleepCounter;
        stepSleepCounter = stepSleepCounter * 2;
        if (sleptSeconds >= waitForTE) stopIterationOnFail('Instance is not archived by TE', null, null);
      }
    }
  });

  group('User downloads the feedback from TE', function () {
    res = appInstances.getInstanceById(userToken, partyId, instanceId, appOwner, appName);
    success = check(res, {
      'GET instance by id after feedback - status is 200': (r) => r.status === 200,
      'Instance is archived after feedback': (r) => r.json('status.isArchived') == true,
    });
    addErrorCount(success);
    stopIterationOnFail('Instance does not have archived status', success, res);

    var dataElements = res.json('data');
    if (dataElements.length > 0) {
      for (var i = 0; i < dataElements.length; i++) {
        if (dataElements[i].dataType == 'feedback') {
          feedbackDataId = dataElements[i].id;
        }
      }
    }

    res = appData.getDataById(userToken, partyId, instanceId, feedbackDataId, appOwner, appName);
    success = check(res, {
      'Download feedback attachment - status is 200': (r) => r.status === 200,
    });
    addErrorCount(success);
  });

  deleteSblInstance(userToken, partyId, instanceId, 'true');
}
