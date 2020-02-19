import http from "k6/http";
import * as config from "../../config.js";
import * as header from "../../buildrequestheaders.js"

//Api call to Storage:Applications for an Org and returns response
export function getAllApplications(altinnStudioRuntimeCookie, appOwner){
    var endpoint = config.platformStorage["applications"] + "/" + appOwner;
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie);    
    return http.get(endpoint, params);
};

//Api call to Storage:Applications to get app metadata by appName and returns response
export function getAppByName(altinnStudioRuntimeCookie, appOwner, appName){
    var endpoint = config.platformStorage["applications"] + "/" + appOwner + "/" + appName;
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie);    
    return http.get(endpoint, params);
};

//Api call to Storage:Applications to create an application with app metadata and returns response code
export function postCreateApp(altinnStudioRuntimeCookie, appOwner, appName, metadata){
    var endpoint = config.platformStorage["applications"] + "?appId=" + appOwner + "/" + appName;
    var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie);
    var requestBody = JSON.stringify(metadata);
    return http.post(endpoint, requestBody, params);
};

//Api call to Storage:Applications to Edit an application with app metadata and returns response code
export function putEditApp(altinnStudioRuntimeCookie, appOwner, appName, metadata){
    var endpoint = config.platformStorage["applications"] + "/" + appOwner + "/" + appName;
    var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie);
    var requestBody = JSON.stringify(metadata);
    return http.put(endpoint, requestBody, params);
};

//Function to find and return attachment data type from app metadata
export function findAttachmentDataType(appMetadata){
    appMetadata = JSON.parse(appMetadata);
    var value = "";
    var dataTypes = appMetadata.dataTypes;
    var dataTypesCount = dataTypes.length;
    for(var i=0; i<dataTypesCount; i++){
        if (dataTypes[i].id !== "default" && dataTypes[i].id !== "ref-data-as-pdf"){
            value = dataTypes[i].id
            break;
        }
    }
    return value;
};