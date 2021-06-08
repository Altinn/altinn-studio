/*
  Create and archive instances of Sirius app (app with 3 task process - data, confirm and feedback)
  data, confirm - end user
  feedback - app owner
  test wait for time sent in wait variable (value in seconds) before attachment is uploaded and instance archived
  by the app owner
  Test data: a json file named as ex: users_prod.json with user data in below format in the K6/src/data folder and deployed RF-0002 app
  [
    {
        "username": "",
        "password": "",
        "partyid": ""
    }
  ]

  Environment variables for test environments (to get appowner token): 
  -e tokengenuser=*** -e tokengenuserpwd=*** -e scopes=altinn:serviceowner/instances.read

  example: k6 run -i 20 --duration 1m --logformat raw --console-output=./src/data/instances.csv src/tests/app/sirius.js 
  -e env=test -e org=ttd -e level2app=sirius -e appsaccesskey=*** -e maskinporten=token -e wait=5
*/

import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { addErrorCount, stopIterationOnFail } from '../../errorcounter.js';
import * as appInstances from '../../api/app/instances.js';
import * as apps from '../../api/platform/storage/applications.js';
import * as appData from '../../api/app/data.js';
import * as appProcess from '../../api/app/process.js';
import * as platformInstances from '../../api/platform/storage/instances.js';
import { deleteSblInstance } from '../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../setup.js';

const appOwner = __ENV.org;
const appName = __ENV.level2app;
const environment = __ENV.env.toLowerCase();
const waitBeforeArchiving = parseInt(__ENV.wait);
const fileName = 'users_' + environment + '.json';

let instanceFormDataXml = open('../../data/' + appName + '.xml');
let attachmentXml1 = open('../../data/xml1.xml', 'b');
let attachmentXml2 = open('../../data/xml2.xml', 'b');
let pdfAttachment = open('../../data/test_file_pdf.pdf', 'b');
let users = new SharedArray('test users', function () {
  var usersArray = JSON.parse(open('../../data/' + fileName));
  return usersArray;
});
const usersCount = users.length;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup() {
  //get token for appowner: ttd
  var data = {};
  var altinnStudioRuntimeCookie = setUpData.getAltinnTokenForTTD();
  data.RuntimeToken = altinnStudioRuntimeCookie;
  var attachmentDataType = apps.getAppByName(altinnStudioRuntimeCookie, appOwner, appName);
  attachmentDataType = apps.findAttachmentDataType(attachmentDataType.body);
  data.attachmentDataType = attachmentDataType;
  return data;
}

//Tests for App API: Sirius app with 3 task process
export default function (data) {
  var userNumber = (__VU - 1) % usersCount;
  var instanceId, dataId, res, success, aspxauthCookie, userRuntimeToken;
  const orgRuntimeToken = data['RuntimeToken'];
  const attachmentDataType = data['attachmentDataType'];
  const feedbackAttachmentDataType = 'feedback-attachment';

  try {
    var userSSN = users[userNumber].username;
    var userPwd = users[userNumber].password;
    var partyId = users[userNumber].partyid;
  } catch (error) {
    stopIterationOnFail('Testdata missing', false, null);
  }

  group('Authentication', function () {
    aspxauthCookie = setUpData.authenticateUser(userSSN, userPwd);
    userRuntimeToken = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    setUpData.clearCookies();
  });

  group('Instantiate and form filling', function () {
    //Test to create an instance with App api and validate the response
    res = appInstances.postInstance(userRuntimeToken, partyId, appOwner, appName);
    success = check(res, {
      'Create Instance status is 201:': (r) => r.status === 201,
    });
    addErrorCount(success);
    stopIterationOnFail('Create Instance:', success, res);

    try {
      dataId = appData.findDataId(res.body);
      instanceId = platformInstances.findInstanceId(res.body);
    } catch (error) {
      stopIterationOnFail('Instance id and data id not retrieved:', false, null);
    }

    //Test to edit a form data in an instance with App APi and validate the response
    res = appData.putDataById(userRuntimeToken, partyId, instanceId, dataId, 'default', instanceFormDataXml, appOwner, appName);
    success = check(res, {
      'Edit Data by Id status is 201:': (r) => r.status === 201,
    });
    addErrorCount(success);
    stopIterationOnFail('Edit Form Data by Id:', success, res);

    //upload an XML attachment 1 to an instance with App API
    res = appData.postData(userRuntimeToken, partyId, instanceId, attachmentDataType, attachmentXml1, appOwner, appName);
    success = check(res, {
      'Upload attachment 1 in data stage status is 201:': (r) => r.status === 201,
    });
    addErrorCount(success);
    stopIterationOnFail('Upload attachment 1 in data stage:', success, res);

    //upload an XML attachment 2 to an instance with App API
    res = appData.postData(userRuntimeToken, partyId, instanceId, attachmentDataType, attachmentXml2, appOwner, appName);
    success = check(res, {
      'Upload attachment 2 in data stage status is 201:': (r) => r.status === 201,
    });
    addErrorCount(success);
    stopIterationOnFail('Upload attachment 2 in data stage:', success, res);
  });

  group('Confirm stage', function () {
    //Test to get validate instance and verify that validation of instance is ok
    res = appInstances.getValidateInstance(userRuntimeToken, partyId, instanceId, appOwner, appName);
    success = check(res, {
      'Validate Instance validation OK:': (r) => r.body && JSON.parse(r.body).length === 0,
    });
    addErrorCount(success);
    stopIterationOnFail('Validate Instance validation OK:', success, res);

    //Test to move the process of an app instance to the confirm stage and verify response code to be 200
    res = appProcess.putNextProcess(userRuntimeToken, partyId, instanceId, null, appOwner, appName);
    success = check(res, {
      'Move process to Confirm stage status is 200:': (r) => r.status === 200,
    });
    addErrorCount(success);
    stopIterationOnFail('Move process to Confirm stage:', success, res);

    //Test to call get instance details and verify the presence of archived date
    res = appInstances.getInstanceById(userRuntimeToken, partyId, instanceId, appOwner, appName);
    success = check(res, {
      'GET instance by id status is 200:': (r) => r.status === 200,
    });
    addErrorCount(success);
    stopIterationOnFail('GET instance by id status is 200:', success, res);
  });

  group('Feedback stage', function () {
    //Test to get validate instance in confirm stage and verify that validation of instance is ok
    res = appInstances.getValidateInstance(userRuntimeToken, partyId, instanceId, appOwner, appName);
    success = check(res, {
      'Validate Instance in confirm stage validation OK:': (r) => r.body && JSON.parse(r.body).length === 0,
    });
    addErrorCount(success);
    stopIterationOnFail('Validate Instance in confirm stage validation OK:', success, res);

    //Test to move the process of an app instance to the Feedback stage and verify response code to be 200
    res = appProcess.putNextProcess(userRuntimeToken, partyId, instanceId, null, appOwner, appName);
    success = check(res, {
      'Move process to Feedback stage status is 200:': (r) => r.status === 200,
    });
    addErrorCount(success);
    stopIterationOnFail('Move process to Feedback stage:', success, res);

    /**
     * Send get process api call every second for first ten times until waitBeforeArchiving is reached
     * 11th to 20th time, send get process api call with doubling time interval until waitBeforeArchiving is reached
     * 2s, 4s, 8s, 16s, etc.,
     */
    if (waitBeforeArchiving != null && waitBeforeArchiving > 0) {
      var sleptSeconds = 0;
      for (var i = 1; i <= 10; i++) {
        res = appProcess.getCurrentProcess(userRuntimeToken, partyId, instanceId, appOwner, appName);
        success = check(res, {
          'Get Current process status is 200:': (r) => r.status === 200,
        });
        addErrorCount(success);
        stopIterationOnFail('Get Current process:', success, res);

        sleep(1);
        sleptSeconds = sleptSeconds + 1;
        if (sleptSeconds == waitBeforeArchiving) break;
      }
      if (waitBeforeArchiving > 10) {
        var stepSleepCounter = 1;
        for (var i = 11; i <= 20; i++) {
          res = appProcess.getCurrentProcess(userRuntimeToken, partyId, instanceId, appOwner, appName);
          success = check(res, {
            'Get Current process status is 200:': (r) => r.status === 200,
          });
          addErrorCount(success);
          stopIterationOnFail('Get Current process:', success, res);

          stepSleepCounter = stepSleepCounter * 2;
          sleep(stepSleepCounter);
          sleptSeconds = sleptSeconds + stepSleepCounter;
          if (sleptSeconds >= waitBeforeArchiving) break;
        }
      }
    }
  });

  group('AppOwner uploads attachment and archive', function () {
    //upload a upload attachment as app owner in feedback stage of the instance and verify response
    res = appData.postData(orgRuntimeToken, partyId, instanceId, feedbackAttachmentDataType, pdfAttachment, appOwner, appName);
    success = check(res, {
      'Upload attachment in feedback stage status is 201:': (r) => r.status === 201,
    });
    addErrorCount(success);
    stopIterationOnFail('Upload attachment in feedback stage:', success, res);

    //Test to archive an instance in feedback stage as an app owner and verify response code to be 200
    res = appProcess.putNextProcess(orgRuntimeToken, partyId, instanceId, null, appOwner, appName);
    success = check(res, {
      'Archive the instance status is 200:': (r) => r.status === 200,
    });
    addErrorCount(success);
    stopIterationOnFail('Archive the instance:', success, res);
  });

  deleteSblInstance(userRuntimeToken, partyId, instanceId, 'true');

  /* write the instance id to console which can be written to a file using --console-output and logformat raw
    for appowner tests. */
  console.log(partyId + '/' + instanceId);
}
