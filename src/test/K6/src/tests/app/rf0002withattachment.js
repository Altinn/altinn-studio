import { check, fail } from "k6";
import {addErrorCount} from "../../errorcounter.js";
import * as appInstances from "../../api/app/instances.js"
import * as appData from "../../api/app/data.js"
import * as appProcess from "../../api/app/process.js"
import * as platformInstances from "../../api/storage/instances.js"
import * as apps from "../../api/storage/applications.js"
import {deleteSblInstance} from "../../api/storage/messageboxinstances.js"
import * as setUpData from "../../setup.js";

let instanceFormDataXml = open("../../data/rf-0002.xml");
let appOwner = __ENV.org;
let level2App = __ENV.level2app;
let smallAttachment = open("../../data/50kb.txt");
let mediumAttachment = open("../../data/1mb.txt");
let bigAttachment = open("../../data/99mb.txt");
let users = JSON.parse(open("../../data/users.json"));

export const options = {
    thresholds:{
        "errors": ["count<1"]
    },
    vus: 100,
    stages: [        
        { duration: '10m', target: 100 }
      ]
};

//Tests for App API: RF-0002
export default function() {
    var userNumber = (__VU - 1) % users.length;
    var aspxauthCookie = setUpData.authenticateUser(users[userNumber].username, users[userNumber].password);  
    const runtimeToken = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    setUpData.clearCookies();
    var attachmentDataType = apps.getAppByName(runtimeToken, appOwner, level2App);
    attachmentDataType = apps.findAttachmentDataType(attachmentDataType.body);   
    const partyId = users[userNumber].partyid;  
    var instanceId = "";    
    var dataId = "";  

    //Test to create an instance with App api and validate the response
    instanceId = appInstances.postInstance(runtimeToken, partyId);
    var success = check(instanceId, {
        "E2E App POST Create Instance status is 201:": (r) => r.status === 201        
      });  
    addErrorCount(success);

    if (!success) {
        fail("E2E App POST Create Instance status is 201: " + JSON.stringify(instanceId));
    };
    
    dataId = appData.findDataId(instanceId.body);
    instanceId = platformInstances.findInstanceId(instanceId.body);  
    
    //Test to edit a form data in an instance with App APi and validate the response
    var res = appData.putDataById(runtimeToken, partyId, instanceId, dataId, "default", instanceFormDataXml);
    success = check(res, {
        "E2E PUT Edit Data by Id status is 201:": (r) => r.status === 201        
    });  
    addErrorCount(success);

    if (!success) {
        fail("E2E PUT Edit Data by Id status is 201:" + JSON.stringify(res));
    };

    //dynamically assign attachments - 60% VU gets small , 30% VU gets medium and 10% VU gets big attachment.
    if (userNumber < (users.length)*0.60)
        {var attachment = smallAttachment;}
    else{
        var attachment = (userNumber < (users.length)*0.90) ? mediumAttachment : bigAttachment;
    };
    
    //upload a upload attachment to an instance with App API
    res = appData.postData(runtimeToken, partyId, instanceId, attachmentDataType, attachment);
    success = check(res, {
        "E2E POST upload attachment Data status is 201:": (r) => r.status === 201        
    });  
    addErrorCount(success);

    if (!success) {
        fail("E2E POST upload attachment Data status is 201:" + JSON.stringify(res));
    };

    //Test to get validate instance and verify that validation of instance is ok
    res = appInstances.getValidateInstance(runtimeToken, partyId, instanceId);
    success = check(res, {
        "E2E App GET Validate Instance validation OK:": (r) => r.body && (JSON.parse(r.body)).length === 0     
    });  
    addErrorCount(success);

    if (!success) {
        fail("E2E App GET Validate Instance is not OK: " + JSON.stringify(res));
    };

    //Test to get next process of an app instance again and verify response code  to be 200
    res = appProcess.getNextProcess(runtimeToken, partyId, instanceId);

    if (res.status !== 200) {
        fail("Unable to get next element id: " + JSON.stringify(res));
    };

    var nextElement = (JSON.parse(res.body))[0];

    //Test to move the process of an app instance to the next process element and verify response code to be 200
    res = appProcess.putNextProcess(runtimeToken, partyId, instanceId, nextElement);
    success = check(res, {
        "E2E App PUT Move process to Next element status is 200:": (r) => r.status === 200      
    });  
    addErrorCount(success);

    if (!success) {
        fail("E2E App PUT Move process to Next element status is 200: " + JSON.stringify(res));
    };

    //Test to call get instance details and verify the presence of archived date
    res = appInstances.getInstanceById(runtimeToken, partyId, instanceId);    
    success = check(res, {
        "E2E App Instance is archived:": (r) => (JSON.parse(r.body)).status.archived != null
    }); 

    if (!success) {
        fail("E2E App Instance is not archived. " + JSON.stringify(res));
    };

    deleteSblInstance(runtimeToken, partyId, instanceId, "true");    
};