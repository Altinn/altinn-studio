import http from "k6/http";
import * as config from "../../config.js";
import * as header from "../../buildrequestheaders.js"

//Request to get an org by org number and returns the response
export function getOrganizations(altinnStudioRuntimeCookie, orgNr){    
    var endpoint =   config.platformRegister["organizations"] + orgNr;
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie);    
    return http.get(endpoint,params);
};

//Request to get an org by org number and returns the response
export function getParty(altinnStudioRuntimeCookie, partyId){

    var endpoint =   config.platformRegister["parties"] + partyId;
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie);    
    return http.get(endpoint,params);
};

//Request to get an org by org number and returns the response
export function postPartieslookup(altinnStudioRuntimeCookie, ssn){

    var endpoint =   config.platformRegister["lookup"];    
    var requestBody = {
        "SSN": ssn     
    }; 
    requestBody = JSON.stringify(requestBody);
    var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie);
    return http.post(endpoint, requestBody, params);
};