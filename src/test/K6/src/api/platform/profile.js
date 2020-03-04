import http from "k6/http";
import * as config from "../../config.js";
import * as header from "../../buildrequestheaders.js"

//Request to get user profile by user id and returns the response
export function getProfile(userId, altinnStudioRuntimeCookie){
    var endpoint = config.platformProfile["users"] + userId;
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie);    
    var res = http.get(endpoint, params);
    return res;
};