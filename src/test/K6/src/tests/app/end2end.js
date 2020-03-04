import { check, sleep } from "k6";
import {addErrorCount} from "../../errorcounter.js";
import * as appInstances from "../../api/app/instances.js"
import * as appData from "../../api/app/data.js"
import * as appProcess from "../../api/app/process.js"
import * as platformInstances from "../../api/storage/instances.js"
import * as apps from "../../api/storage/applications.js"
import {deleteSblInstance} from "../../api/storage/messageboxinstances.js"
import * as setUpData from "../../setup.js";

let appOwner = __ENV.org;
let level2App = __ENV.level2app;
let instanceFormDataXml = open("../../data/instanceformdata.xml");
let pdfAttachment = open("../../data/test_file_pdf.pdf", "b");
let bigAttachment = open("../../data/test_file_morethan_1mb.txt", "b");

export const options = {
    thresholds:{
        "errors": ["rate<0.000001"]
    }
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup(){
    var aspxauthCookie = setUpData.authenticateUser();    
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);    
    var data = setUpData.getUserData(altinnStudioRuntimeCookie);
    data.RuntimeToken = altinnStudioRuntimeCookie;
    setUpData.clearCookies();
    var attachmentDataType = apps.getAppByName(altinnStudioRuntimeCookie, appOwner, level2App);
    attachmentDataType = apps.findAttachmentDataType(attachmentDataType.body);
    data.attachmentDataType = attachmentDataType;    
    return data;
};


//Tests for App API: Data
export default function(data) {
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];
    const attachmentDataType = data["attachmentDataType"];
    var instanceId = "";    
    var dataId = "";    

    //Test to create an instance with App api and validate the response
    instanceId = appInstances.postInstance(runtimeToken, partyId);
    var success = check(instanceId, {
        "E2E App POST Create Instance status is 201:": (r) => r.status === 201        
      });  
    addErrorCount(success);    

    dataId = appData.findDataId(instanceId.body);
    instanceId = platformInstances.findInstanceId(instanceId.body);

    //Test to get current process of an app instance and verify response code to be 200
    var res = appProcess.getCurrentProcess(runtimeToken, partyId, instanceId);
    success = check(res, {
        "E2E App GET current process status is 200:": (r) => r.status === 200      
    });  
    addErrorCount(success);
    
    //Test to get validate instance and verify response code to have error "TooFewDataElementsOfType"
    res = appInstances.getValidateInstance(runtimeToken, partyId, instanceId);
    success = check(res, {
        "E2E App GET Validate Instance response has TooFewDataElementsOfType:": (r) => (JSON.parse(r.body))[0].code === "TooFewDataElementsOfType"     
    });  
    addErrorCount(success);          
    
    //Test to edit a form data in an instance with App APi and validate the response
    res = appData.putDataById(runtimeToken, partyId, instanceId, dataId, "default", instanceFormDataXml);
    success = check(res, {
        "E2E PUT Edit Data by Id status is 201:": (r) => r.status === 201        
    });  
    addErrorCount(success);      

    //upload a big attachment to an instance with App API
    res = appData.postData(runtimeToken, partyId, instanceId, attachmentDataType, bigAttachment);

    dataId = (JSON.parse(res.body)).id;

    //Test to get validate instance attachment data and verify response code to have error "DataElementTooLarge"
    res = appData.getValidateInstanceData(runtimeToken, partyId, instanceId, dataId);
    success = check(res, {
        "E2E App GET Validate InstanceData response has DataElementTooLarge:": (r) => (JSON.parse(r.body))[0].code === "DataElementTooLarge"     
    });  
    addErrorCount(success); 

    //delete the big attachment from an instance with App API
    appData.deleteDataById(runtimeToken, partyId, instanceId, dataId);
    
    //upload a valid attachment to an instance with App API
    res = appData.postData(runtimeToken, partyId, instanceId, attachmentDataType, pdfAttachment);

    dataId = (JSON.parse(res.body)).id;

    //Test to get validate instance attachment data and verify that validation of instance is ok
    res = appData.getValidateInstanceData(runtimeToken, partyId, instanceId, dataId);
    success = check(res, {
        "E2E App GET Validate InstanceData: Validation OK:": (r) => (JSON.parse(r.body)).length === 0     
    });  
    addErrorCount(success); 

    //Test to get validate instance and verify that validation of instance is ok
    res = appInstances.getValidateInstance(runtimeToken, partyId, instanceId);
    success = check(res, {
        "E2E App GET Validate Instance validation OK:": (r) => (JSON.parse(r.body)).length === 0     
    });  
    addErrorCount(success);

    //Test to get next process of an app instance again and verify response code  to be 200
    res = appProcess.getNextProcess(runtimeToken, partyId, instanceId);
    
    var nextElement = (JSON.parse(res.body))[0];

    //Test to move the process of an app instance to the next process element and verify response code to be 200
    res = appProcess.putNextProcess(runtimeToken, partyId, instanceId, nextElement);
    success = check(res, {
        "E2E App PUT Move process to Next element status is 200:": (r) => r.status === 200      
    });  
    addErrorCount(success);

    //Test to call get instance details and verify the presence of archived date
    res = appInstances.getInstanceById(runtimeToken, partyId, instanceId);    
    success = check(res, {
        "E2E App Instance is archived:": (r) => (JSON.parse(r.body)).status.archived != null
    });  
    deleteSblInstance(runtimeToken, partyId, instanceId, "true");    
};