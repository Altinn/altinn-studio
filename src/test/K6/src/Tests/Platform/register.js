import { check, sleep } from "k6";
import {Counter} from "k6/metrics";
import * as register from "../../Apicalls/Platform/register.js";
import * as setUpData from "../../setup.js";

let ErrorCount = new Counter("errors");

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
    data.RuntimeToken = altinnStudioRuntimeCookie;
    return data;
};

//Test for platform register
export default function(data) {
    var runtimeToken = data["RuntimeToken"];
    var partyId = data["partyId"];
    var ssn = data["ssn"];
    var orgNr = data["orgNumber"];

    //Api call to Platform: Register: Get organization by orgno and validate response
    var res = register.getOrganizations(runtimeToken, orgNr);    
    var success = check(res, {
      "GET Org: status is 200": (r) => r.status === 200,
      "GET Org: org number is not empty": (r) => (JSON.parse(r.body)).orgNumber != null
    });  
    if (!success){
      ErrorCount.add(1);
    }
    sleep(1);

    //Api call to Platform: Register: Get parties by partyId and validate response
    res = register.getParty(runtimeToken, partyId);    
    var success = check(res, {
      "GET Party: status is 200": (r) => r.status === 200,
      "GET Party: party id matches": (r) => (JSON.parse(r.body)).partyId === partyId
    });  
    if (!success){
        ErrorCount.add(1);
    }
    sleep(1);

    //Api call to Platform: Register: POST party lookup by SSN and validate response
    res = register.postPartieslookup(runtimeToken, ssn);    
    var success = check(res, {
        "GET Party info: status is 200": (r) => r.status === 200,
        "GET Party info: party id matches": (r) => (JSON.parse(r.body)).partyId === partyId
    });  
    if (!success){
        ErrorCount.add(1);
    }
    sleep(1);
};