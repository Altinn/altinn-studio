import http from "k6/http";
import * as config from "../../config.js";
import * as header from "../../buildrequestheaders.js"

//Api call to App Api:Data to add a data to an app instance and returns response
export function postData(altinnStudioRuntimeCookie, dataType, appOwner, appName) {
    var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls("", "", "", dataType, "statelessdata")
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, "");    
    return http.post(endpoint, null, params);
};

//Api call to App Api:Data to edit a data by id of an app instance and returns response
export function putDataByType(altinnStudioRuntimeCookie, dataType, data, appOwner, appName) {
    var endpoint = config.appApiBaseUrl(appOwner, appName) + config.buildAppApiUrls("", "", "", dataType, "statelessdata");
    var params = header.buildHeadersForData(false, altinnStudioRuntimeCookie, "app");    
    var requestBody = data;
    return http.put(endpoint, requestBody, params);
};

