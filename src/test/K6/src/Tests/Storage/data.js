import { check, sleep } from "k6";
import {Counter} from "k6/metrics";
import * as apps from "../../Apicalls/Storage/applications.js"
import * as instances from "../../Apicalls/Storage/instances.js"
import * as instanceData from "../../Apicalls/Storage/data.js"
import * as setUpData from "../../setup.js";

let ErrorCount = new Counter("errors");
let appOwner = __ENV.org;
let level2App = __ENV.level2app;
let instanceJson = open("../../Data/instance.json");
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
    var attachmentDataType = apps.getAppByName(altinnStudioRuntimeCookie, appOwner, level2App);
    attachmentDataType = apps.findAttachmentDataType(attachmentDataType.body);
    data.attachmentDataType = attachmentDataType;
    var instanceId = instances.postIntance(altinnStudioRuntimeCookie,  data["partyId"], appOwner, level2App, instanceJson);
    instanceId = instances.findInstanceId(instanceId.body);
    data.instanceId = instanceId;
    return data;
};


//Tests for platform Storage: Instances
export default function(data) {
    var runtimeToken = data["RuntimeToken"];
    var partyId = data["partyId"];
    var attachmentDataType = data["attachmentDataType"];
    var instanceId = data["instanceId"];  
    var dataId = "";    

    //Test to add an form data to an instance with storage api and validate the response
    var res = instanceData.postdata(runtimeToken, partyId, instanceId, "default", instanceFormDataXml);    
    var success = check(res, {
      "POST Create Data: status is 201": (r) => r.status === 201,
      "POST Create Instance: Data Id is not null": (r) => (JSON.parse(r.body)).id != null
    });  
    if (!success){
      ErrorCount.add(1);
    };
    sleep(1);    

    
};