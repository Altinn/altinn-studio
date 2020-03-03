import { check, sleep } from "k6";
import {addErrorCount} from "../../../errorcounter.js";
import * as instances from "../../../api/storage/instances.js"
import * as setUpData from "../../../setup.js";


let appOwner = __ENV.org;
let level2App = __ENV.level2app;
let instanceJson = open("../../../data/instance.json");

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
    return data;
};


//Tests for platform Storage: Instances
export default function(data) {
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];
    var instanceId = "";    

    //Test to create an instance with storage api and validate the response
    var res = instances.postInstance(runtimeToken, partyId, appOwner, level2App, instanceJson);    
    var success = check(res, {
      "POST Create Instance status is 201:": (r) => r.status === 201,
      "POST Create Instance Instace Id is not null:": (r) => JSON.parse(r.body).id != null
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

    //Test to get all instances for a party from storage and validate the response to have 403 as code
    res = instances.getAllinstances(runtimeToken, partyId);
    success = check(res, {
        "GET Instaces by instanceOwner status is 403:": (r) => r.status === 403        
        });  
    addErrorCount(success);    

    //Test to edit an instance by id in storage and validate the response
    res = instances.putInstanceById(runtimeToken, partyId, instanceId);    
    success = check(res, {
        "PUT Edit Instance status is 200:": (r) => r.status === 200        
        });  
    addErrorCount(success);    
};