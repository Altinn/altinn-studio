import { check, sleep } from "k6";
import {Counter} from "k6/metrics";
import * as authz from "../../Apicalls/Platform/authorization.js";
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
    return data;
};

//Test for platform Authorization
export default function(data) {
    var userId = data["userId"];
    var partyId = data["partyId"];     

    //Api call to Platform: Register: Get organization by orgno and validate response
    var res = authz.getParties(userId);    
    var success = check(res, {
      "GET Parties: status is 200": (r) => r.status === 200,
      "GET Parties: Parties list is not empty": (r) => (JSON.parse(r.body)).length != null
    });  
    if (!success){
      ErrorCount.add(1);
    }
    sleep(1);
};