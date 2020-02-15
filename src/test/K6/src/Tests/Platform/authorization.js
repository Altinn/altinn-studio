import { check, sleep } from "k6";
import {Counter} from "k6/metrics";
import * as authz from "../../Apicalls/Platform/authorization.js";
import * as setUpData from "../../setup.js";

let ErrorCount = new Counter("errors");
let appOwner = __ENV.org;
let testappName = __ENV.testapp;
let policyFile = open("../../Data/policy.xml","b");
let pdpInputJson = open("../../Data/pdpinput.json");

export const options = {
    thresholds:{
        "errors": ["rate<0.000001"]
    }
};

//Function to setup data and reurn userData
export function setup(){
    var aspxauthCookie = setUpData.authenticateUser();    
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    var data = setUpData.getUserData(altinnStudioRuntimeCookie);    
    return data;
};

//Test for platform Authorization
export default function(data) {
    var userId = data["userId"];
    var partyId = data["partyId"];
    var altinnTask = "";     

    //Api call to Platform: Authorization: Get parties of an user and validate response
    var res = authz.getParties(userId);    
    var success = check(res, {
      "GET Parties: Status is 200": (r) => r.status === 200,
      "GET Parties: Parties list is not empty": (r) => (JSON.parse(r.body)).length != null
    });  
    if (!success){
      ErrorCount.add(1);
    }
    sleep(1);

    //Api call to Platform: Authorization: Get roles of the user self
    var res = authz.getRoles(userId, partyId);    
    var success = check(res, {
      "GET Roles: Status is 200": (r) => r.status === 200,
      "GET Roles: Roles list is not empty": (r) => (JSON.parse(r.body)).length != null
    });  
    if (!success){
      ErrorCount.add(1);
    }
    sleep(1);

    //Api call to Platform: Authorization: Upload app policy to storage    
    var res = authz.postPolicy(policyFile, appOwner, testappName);    
    var success = check(res, {
      "POST Policy: Status is 200": (r) => r.status === 200,      
    });  
    if (!success){
      ErrorCount.add(1);
    }
    sleep(1);

    //Api call to Platform: Authorization: Get a decision from PDP with appOwner details 
    //and validate response to have Permit
    var jsonPermitData = {
        "AccessSubject": ["urn:altinn:org"], 
        "Action": ["read"], 
        "Resource": ["urn:altinn:app", "urn:altinn:org"]};    
    var res = authz.postGetDecision(pdpInputJson, jsonPermitData, appOwner, testappName, userId, partyId, altinnTask);
    var success = check(res, {
      "Get PDP Decision for appOwner: Status is 200": (r) => r.status === 200,      
      "Get PDP Decision for appOwner: Decision is Permit": (r) => (JSON.parse(r.body)).response[0].decision === "Permit", 
    });  
    if (!success){
      ErrorCount.add(1);
    }
    sleep(1);

    //Api call to Platform: Authorization: Get a decision from PDP with appOwner details
    //and validate response to have NotApplicable
    var jsonPermitData = {
      "AccessSubject": ["urn:altinn:org"], 
      "Action": ["sign"], 
      "Resource": ["urn:altinn:app", "urn:altinn:org"]};
    altinnTask = ""; 
    var res = authz.postGetDecision(pdpInputJson, jsonPermitData, appOwner, testappName, userId, partyId, altinnTask);
    var success = check(res, {
      "Get PDP Decision for appOwner: Status is 200": (r) => r.status === 200,      
      "Get PDP Decision for appOwner: Decision is NotApplicable": (r) => (JSON.parse(r.body)).response[0].decision === "NotApplicable", 
    });  
    if (!success){
      ErrorCount.add(1);
    }
    sleep(1);

    //Api call to Platform: Authorization: Get a decision from PDP with user details
    //and validate response to have Permit
    var jsonPermitData = {
      "AccessSubject": ["urn:altinn:userid"], 
      "Action": ["read"], 
      "Resource": ["urn:altinn:app", "urn:altinn:org", "urn:altinn:partyid", "urn:altinn:task"]};
    var altinnTask = "Task_1"; 
    var res = authz.postGetDecision(pdpInputJson, jsonPermitData, appOwner, testappName, userId, partyId, altinnTask);    
    var success = check(res, {
      "Get PDP Decision for User: Status is 200": (r) => r.status === 200,      
      "Get PDP Decision for User: Decision is Permit": (r) => (JSON.parse(r.body)).response[0].decision === "Permit", 
    });  
    if (!success){
      ErrorCount.add(1);
    }
    sleep(1);
};