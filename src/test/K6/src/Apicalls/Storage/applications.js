import http from "k6/http";
import * as config from "../../config.js";

//Api call to Storage:Applications for an Org and returns response
export function getAllApplications(altinnStudioRuntimeCookie, appOwner){
    var endpoint = config.platformStorage["applications"] + "/" + appOwner;
    var params = {
        headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie}
    };
    return http.get(endpoint, params);
};

//Api call to Storage:Applications to get app metadata by appName and returns response
export function getAppByName(altinnStudioRuntimeCookie, appOwner, appName){
    var endpoint = config.platformStorage["applications"] + "/" + appOwner + "/" + appName;
    var params = {
        headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie}
    };
    return http.get(endpoint, params);
};

//Api call to Storage:Applications to create an application with app metadata and returns response code
export function postCreateApp(altinnStudioRuntimeCookie, appOwner, appName, metadata){
    var endpoint = config.platformStorage["applications"] + "?appId=" + appOwner + "/" + appName;
    var params = {
        headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie,
                  "Content-Type": "application/json"  }
    };
    var requestBody = JSON.stringify(metadata);
    return http.post(endpoint, requestBody, params);
};

//Api call to Storage:Applications to Edit an application with app metadata and returns response code
export function putEditApp(altinnStudioRuntimeCookie, appOwner, appName, metadata){
    var endpoint = config.platformStorage["applications"] + "/" + appOwner + "/" + appName;
    var params = {
        headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie,
                  "Content-Type": "application/json"     }
    };
    var requestBody = JSON.stringify(metadata);
    return http.put(endpoint, requestBody, params);
};