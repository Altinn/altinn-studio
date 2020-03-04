import { check, sleep } from "k6";
import {addErrorCount} from "../../../errorcounter.js";
import * as register from "../../../api/platform/register.js";
import * as setUpData from "../../../setup.js";

export const options = {
    thresholds:{
        "errors": ["rate<0.000001"]
    }
};

//Function to setup data and return userData
export function setup(){
    var aspxauthCookie = setUpData.authenticateUser();    
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    var data = setUpData.getUserData(altinnStudioRuntimeCookie);
    data.RuntimeToken = altinnStudioRuntimeCookie;
    return data;
};

//Tests for platform register
export default function(data) {
    const runtimeToken = data["RuntimeToken"];
    const partyId = data["partyId"];
    const ssn = data["ssn"];
    const orgNr = data["orgNumber"];

    //Test Platform: Register: Get organization by orgno and validate response
    var res = register.getOrganizations(runtimeToken, orgNr);    
    var success = check(res, {
      "GET Org status is 200:": (r) => r.status === 200,
      "GET Org org number is not empty:": (r) => (JSON.parse(r.body)).orgNumber != null
    });  
    addErrorCount(success);    

    //Test Platform: Register: Get parties by partyId and validate response
    res = register.getParty(runtimeToken, partyId);    
    success = check(res, {
      "GET Party status is 200:": (r) => r.status === 200,
      "GET Party party id matches:": (r) => (JSON.parse(r.body)).partyId === partyId
    });  
    addErrorCount(success);    

    //Test Platform: Register: POST party lookup by SSN and validate response
    res = register.postPartieslookup(runtimeToken, ssn);    
    success = check(res, {
        "GET Party info status is 200:": (r) => r.status === 200,
        "GET Party info party id matches:": (r) => (JSON.parse(r.body)).partyId === partyId
    });  
    addErrorCount(success);    
};