import http from "k6/http";
import * as config from "../../config.js";
import * as header from "../../buildrequestheaders.js"

//Api call to App Api:Data to get a data by id of an app instance and returns response
export function getDataById(altinnStudioRuntimeCookie, partyId, instaceId, dataId){    
    var endpoint = config.buildAppApiUrls(partyId, instaceId, dataId, "dataid");
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie);    
    return http.get(endpoint, params);
};

//Function to return the first data id from an instance JSON object
export function findDataId(instanceJson){
    instanceJson = JSON.parse(instanceJson);
    var dataId = instanceJson.data[0].id ;
    return dataId;
};

//Api call to App Api:Data to edit a data by id of an app instance and returns response
export function putDataById(altinnStudioRuntimeCookie, partyId, instaceId, dataId, dataType, data){    
    var endpoint = config.buildAppApiUrls(partyId, instaceId, dataId, "dataid");
    var params = header.buildHeadersForData(dataType, altinnStudioRuntimeCookie);
    var requestBody = data;  
    return http.put(endpoint,requestBody, params);
};

//Api call to App Api:Data to delete a data by id of an app instance and returns response
export function deleteDataById(altinnStudioRuntimeCookie, partyId, instaceId, dataId){    
    var endpoint = config.buildAppApiUrls(partyId, instaceId, dataId, "dataid");
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie);    
    return http.del(endpoint,"", params);
};

//Api call to App Api:Instances to validate an instance data and returns response
export function getValidateInstanceData(altinnStudioRuntimeCookie, partyId, instanceId, dataId){    
    var endpoint = config.buildAppApiUrls(partyId, instanceId, dataId, "dataid") + "/validate";
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie);    
    return http.get(endpoint, params);
};


//Api call to App Api:Data to add a data to an app instance and returns response
export function postData(altinnStudioRuntimeCookie, partyId, instaceId, dataType, data){    
    var endpoint = config.buildAppApiUrls(partyId, instaceId, "", "instanceid") + "/data?dataType=" + dataType;
    var params = header.buildHeadersForData(dataType, altinnStudioRuntimeCookie); 
    return http.post(endpoint, data, params);
};
