import http from "k6/http";
import * as config from "../../config.js";
import * as header from "../../buildrequestheaders.js"


//Batch Api calls before creating an app instance
export function beforeInstanceCreation(altinnStudioRuntimeCookie, partyId){
    let req, res;
    var requestParams = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, "app")
    req = [
        {
            "method": "get",
            "url": config.appResources["textresources"],
            "params": requestParams        
        },{
            "method": "get",
            "url": config.appProfile["user"],
            "params": requestParams
        },{
            "method": "get",
            "url": config.appResources["applicationmetadata"],
            "params": requestParams        
        },{
            "method": "get",
            "url": config.appAuthorization["currentparties"],
            "params": requestParams
        },{
            "method": "post",
            "url": config.appValidateInstantiation + "?partyId=" + partyId,
            "params": requestParams
        }];
    res = http.batch(req);
    return res; 
}