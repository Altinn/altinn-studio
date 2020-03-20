import { check } from "k6";
import {addErrorCount} from "../../../errorcounter.js";
import * as authz from "../../../api/platform/authorization.js";
import * as setUpData from "../../../setup.js";

let userName = __ENV.username;
let userPassword = __ENV.userpwd;
let appOwner = __ENV.org;
let testappName = __ENV.testapp;
let policyFile = open("../../../data/policy.xml","b");
let pdpInputJson = open("../../../data/pdpinput.json");

export const options = {
    thresholds:{
      "errors": ["count<1"]
    }
};

//Function to setup data and return userData
export function setup(){
    var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);    
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    var data = setUpData.getUserData(altinnStudioRuntimeCookie);    
    return data;
};

//Tests for platform Authorization
export default function(data) {
    const userId = data["userId"];
    const partyId = data["partyId"];
    var altinnTask = "";     

    //Test Platform: Authorization: Get parties of an user and validate response
    var res = authz.getParties(userId);    
    var success = check(res, {
      "GET Parties Status is 200:": (r) => r.status === 200,
      "GET Parties Parties list is not empty:": (r) => (JSON.parse(r.body)).length != null
    });  
    addErrorCount(success);    

    //Test Platform: Authorization: Get roles of the user self
    res = authz.getRoles(userId, partyId);    
    success = check(res, {
      "GET Roles Status is 200:": (r) => r.status === 200,
      "GET Roles Roles list is not empty:": (r) => (JSON.parse(r.body)).length != null
    });  
    addErrorCount(success);    

    //Test Platform: Authorization: Upload app policy to storage    
    res = authz.postPolicy(policyFile, appOwner, testappName);    
    success = check(res, {
      "POST Policy Status is 200:": (r) => r.status === 200,      
    });  
    addErrorCount(success);   

    //Test Platform: Authorization: Get a decision from PDP with appOwner details 
    //and validate response to have Permit
    var jsonPermitData = {
        "AccessSubject": ["urn:altinn:org"], 
        "Action": ["read"], 
        "Resource": ["urn:altinn:app", "urn:altinn:org"]};    
    res = authz.postGetDecision(pdpInputJson, jsonPermitData, appOwner, testappName, userId, partyId, altinnTask);
    success = check(res, {
      "Get PDP Decision for appOwner Status is 200:": (r) => r.status === 200,      
      "Get PDP Decision for appOwner Decision is Permit:": (r) => (JSON.parse(r.body)).response[0].decision === "Permit" 
    });  
    addErrorCount(success);   

    //Test Platform: Authorization: Get a decision from PDP with appOwner details
    //and validate response to have NotApplicable
    var jsonPermitData = {
      "AccessSubject": ["urn:altinn:org"], 
      "Action": ["sign"], 
      "Resource": ["urn:altinn:app", "urn:altinn:org"]};
    altinnTask = ""; 
    res = authz.postGetDecision(pdpInputJson, jsonPermitData, appOwner, testappName, userId, partyId, altinnTask);
    success = check(res, {
      "Get PDP Decision for appOwner Status is 200:": (r) => r.status === 200,      
      "Get PDP Decision for appOwner Decision is NotApplicable:": (r) => (JSON.parse(r.body)).response[0].decision === "NotApplicable"
    });  
    addErrorCount(success);   

    //Test Platform: Authorization: Get a decision from PDP with user details
    //and validate response to have Permit
    var jsonPermitData = {
      "AccessSubject": ["urn:altinn:userid"], 
      "Action": ["read"], 
      "Resource": ["urn:altinn:app", "urn:altinn:org", "urn:altinn:partyid", "urn:altinn:task"]};
    var altinnTask = "Task_1"; 
    res = authz.postGetDecision(pdpInputJson, jsonPermitData, appOwner, testappName, userId, partyId, altinnTask);    
    success = check(res, {
      "Get PDP Decision for User Status is 200:": (r) => r.status === 200,      
      "Get PDP Decision for User Decision is Permit:": (r) => (JSON.parse(r.body)).response[0].decision === "Permit"
    });  
    addErrorCount(success); 
};