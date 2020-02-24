import http from "k6/http";
import * as config from "../../config.js";
import * as header from "../../buildrequestheaders.js"

//Api call to App Api:Data to get a data by id of an app instance and returns response
export function getDataById(altinnStudioRuntimeCookie, partyId, instaceId, dataId){    
    var endpoint = config.buildAppApiUrls(partyId, instaceId, dataId, "dataid")
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie);    
    return http.get(endpoint, params);
};

//Function to return the first data id from an instance JSON object
export function findDataId(instanceJson){
    instanceJson = JSON.parse(instanceJson);
    var dataId = instanceJson.data[0].id ;
    return dataId;
};
