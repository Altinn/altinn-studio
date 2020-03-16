import { check, sleep } from "k6";
import * as instances from "../../../api/storage/instances.js"
import * as process from "../../../api/storage/process.js"
import * as sbl from "../../../api/storage/messageboxinstances.js"
import * as setUpData from "../../../setup.js";
import {addErrorCount} from "../../../errorcounter.js";

let appOwner = __ENV.org;
let level2App = __ENV.level2app;
let instanceJson = open("../../../data/instance.json");

export const options = {
    thresholds:{
        "errors": ["rate<0.000001"]
    }
};

//Function to setup data and return AltinnstudioRuntime Token, instance and user details
export function setup(){
    var aspxauthCookie = setUpData.authenticateUser();    
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);    
    var data = setUpData.getUserData(altinnStudioRuntimeCookie);
    data.RuntimeToken = altinnStudioRuntimeCookie; 
    setUpData.clearCookies();   
    var instanceId = instances.postInstance(altinnStudioRuntimeCookie,  data["partyId"], appOwner, level2App, instanceJson);
    instanceId = instances.findInstanceId(instanceId.body);
    data.instanceId = instanceId;
    return data;
};

//Tests for Platform: Storage: Process
export default function (data){
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];    
    const instanceId = data["instanceId"];

    var instanceProcess = instances.getInstanceById(runtimeToken, partyId, instanceId);
    instanceProcess = (JSON.parse(instanceProcess.body)).process;

    //Test to edit the process of an instance and validate the response
    var res = process.putProcess(runtimeToken, partyId, instanceId, instanceProcess);    
    var success = check(res, {
       "PUT Edit Process status is 200:": (r) => r.status === 200       
    });  
    addErrorCount(success);    

    //Test to get the process history of an instance and validate the response
    res = process.getProcessHistory(runtimeToken, partyId, instanceId);    
    success = check(res, {
        "GET Process history status is 200:": (r) => r.status === 200       
    });  
    addErrorCount(success);    
    
};

export function teardown(data){
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];    
    const instanceId = data["instanceId"];
  
    sbl.deleteSblInstance(runtimeToken, partyId, instanceId, "true");
};