import http from "k6/http";
import * as config from "../../config.js";
import * as header from "../../buildrequestheaders.js"

//Api call to App Api:Instances to create an app instance and returns response
export function postInstance(altinnStudioRuntimeCookie, partyId){    
    var endpoint = config.appApiBaseUrl + "/instances?instanceOwnerPartyId=" + partyId;
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, "app"); 
    params.timeout = 120000;
    return http.post(endpoint, null, params);
};

//Api call to App Api:Instances to create an app instance and returns response
export function getInstanceById(altinnStudioRuntimeCookie, partyId, instanceId){    
    var endpoint = config.buildAppApiUrls(partyId, instanceId, "", "instanceid");
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, "app"); 
    params.timeout = 120000;   
    return http.get(endpoint, params);
};

//Api call to App Api:Instances to validate an app instance and returns response
export function getValidateInstance(altinnStudioRuntimeCookie, partyId, instanceId){    
    var endpoint = config.buildAppApiUrls(partyId, instanceId, "", "instanceid") + "/validate";
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, "app"); 
    params.timeout = 120000;   
    return http.get(endpoint, params);
};