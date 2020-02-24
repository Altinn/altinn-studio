import { check, sleep } from "k6";
import {addErrorCount} from "../../errorcounter.js";
import * as appInstances from "../../Apicalls/App/instances.js"
import * as appData from "../../Apicalls/App/data.js"
import * as platformInstances from "../../Apicalls/Storage/instances.js"
import * as apps from "../../Apicalls/Storage/applications.js"
import {deleteSblInstance} from "../../Apicalls/Storage/messageboxinstances.js"
import * as setUpData from "../../setup.js";

let appOwner = __ENV.org;
let level2App = __ENV.level2app;
let instanceFormDataXml = open("../../Data/instanceformdata.xml");
let pdfAttachment = open("../../Data/test_file_pdf.pdf", "b");

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
    var instanceId = appInstances.postInstance(altinnStudioRuntimeCookie,  data["partyId"]);
    var dataId = appData.findDataId(instanceId.body);
    instanceId = platformInstances.findInstanceId(instanceId.body);
    data.instanceId = instanceId;
    data.dataId = dataId; 
    return data;
};


//Tests for App API: Data
export default function(data) {
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];
    const attachmentDataType = data["attachmentDataType"];
    var instanceId = data["instanceId"];    
    var dataId = data["dataId"];    

    //Test to Get instance data by id with App api and validate the response
    var res = appData.getDataById(runtimeToken, partyId, instanceId, dataId);    
    var success = check(res, {
      "App: GET Data by Id: status is 200": (r) => r.status === 200      
    });  
    addErrorCount(success);
    sleep(1);    
};

//Delete the instance created
export function teardown(data){
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];    
    const instanceId = data["instanceId"];

    deleteSblInstance(runtimeToken, partyId, instanceId, "true");    
};