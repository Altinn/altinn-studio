import { check } from "k6";
import {addErrorCount} from "../../../errorcounter.js";
import * as instances from "../../../api/storage/instances.js"
import * as instanceData from "../../../api/storage/data.js"
import * as setUpData from "../../../setup.js";
import * as apps from "../../../api/storage/applications.js"
import * as sbl from "../../../api/storage/messageboxinstances.js"
import {postPartieslookup} from "../../../api/platform/register.js"

const appOwner = __ENV.org;
const level2App = __ENV.level2app;
let instanceFormDataXml = open("../../../data/rf-0002.xml");
let instanceJson = open("../../../data/instance.json");
let users = JSON.parse(open("../../../data/users.json"));

export const options = {
    thresholds:{
        "errors": ["count<1"]
    },
    vus: users.length
};


//Tests for platform Storage: RF-0002
export default function(data) {
    var aspxauthCookie = setUpData.authenticateUser(users[__VU - 1].username, users[__VU - 1].password);    
    var runtimeToken = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie); 
    setUpData.clearCookies();   
    var data = setUpData.getUserData(runtimeToken);    
    var attachmentDataType = apps.getAppByName(runtimeToken, appOwner, level2App);
    attachmentDataType = apps.findAttachmentDataType(attachmentDataType.body); 
    var orgPartyId = postPartieslookup(runtimeToken, "OrgNo", data["orgNumber"])
    data.orgPartyId = JSON.parse(orgPartyId.body).partyId;    
    const partyId = data["orgPartyId"];  
    var instanceId = "";     

    //Test to create an instance with storage api and validate the response
    var res = instances.postInstance(runtimeToken, partyId, appOwner, level2App, instanceJson);    
    var success = check(res, {
      "POST Create Instance status is 201:": (r) => r.status === 201,
      "POST Create Instance Instance Id is not null:": (r) => JSON.parse(r.body).id != null
    });  
    addErrorCount(success);    
    
    if((JSON.parse(res.body)).id != null){
        instanceId = instances.findInstanceId(res.body);
    };

    //Test to get an instance by id from storage and validate the response
    res = instances.getInstanceById(runtimeToken, partyId, instanceId);
    success = check(res, {
        "GET Instance by Id status is 200:": (r) => r.status === 200        
      });  
    addErrorCount(success);    

    //Test to add an form data to an instance with storage api and validate the response
    res = instanceData.postData(runtimeToken, partyId, instanceId, "schema_4222_160523_forms_212_20160523", instanceFormDataXml);    
    success = check(res, {
    "POST Create Data status is 201:": (r) => r.status === 201,
    "POST Create Instance Data Id is not null:": (r) => (JSON.parse(r.body)).id != null
    });  
    addErrorCount(success);    

    //Hard delete the instance
    sbl.deleteSblInstance(runtimeToken, partyId, instanceId, "true");    
};