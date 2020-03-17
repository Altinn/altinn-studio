import { check } from "k6";
import {addErrorCount} from "../../errorcounter.js";
import * as appInstances from "../../api/app/instances.js"
import * as platformInstances from "../../api/storage/instances.js"
import {deleteSblInstance} from "../../api/storage/messageboxinstances.js"
import * as setUpData from "../../setup.js";

let userName = __ENV.username;
let userPassword = __ENV.userpwd;

export const options = {
    thresholds:{
        "errors": ["count<1"]
    }
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup(){
    var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);    
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);    
    var data = setUpData.getUserData(altinnStudioRuntimeCookie);
    data.RuntimeToken = altinnStudioRuntimeCookie;
    return data;
};


//Tests for App Api: Instances
export default function(data) {
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];
    var instanceId = "";    

    //Test to create an instance with App api and validate the response
    var res = appInstances.postInstance(runtimeToken, partyId);    
    var success = check(res, {
      "App POST Create Instance status is 201:": (r) => r.status === 201,
      "App POST Create Instance Instace Id is not null:": (r) => (JSON.parse(r.body)).id != null
    });  
    addErrorCount(success); 
    var instanceJson = res.body;
    if((JSON.parse(instanceJson)).id != null){
        instanceId = platformInstances.findInstanceId(instanceJson);
    };

    //Test to edit an instance by id with App api and validate the response
    res = appInstances.putInstanceById(runtimeToken, partyId, instanceId, instanceJson);    
    success = check(res, {
        "App PUT Edit Instance status is 200:": (r) => r.status === 200        
        });  
    addErrorCount(success);

    //Test to get an instance by id with App api and validate the response
    res = appInstances.getInstanceById(runtimeToken, partyId, instanceId);
    success = check(res, {
        "App GET Instance by Id status is 200:": (r) => r.status === 200        
      });  
    addErrorCount(success);
    
    deleteSblInstance(runtimeToken, partyId, instanceId, "true");    
};