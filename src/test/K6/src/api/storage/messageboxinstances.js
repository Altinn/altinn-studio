import http from "k6/http";
import * as config from "../../config.js";
import * as header from "../../buildrequestheaders.js"

//Api call to Storage:SBL instances to get an instance by id and return response
export function getSblInstanceById(altinnStudioRuntimeCookie, partyId, instanceId) {
    var endpoint = config.buildStorageUrls(partyId, instanceId, "", "sblinstanceid");
    var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, "platform");
    return http.get(endpoint, params);
};

/**
 * Api call to Storage:SBL instances to get an instance for a partyid and return response  
 * @param {*} state the instance state; active, archived or deleted
 */
export function getSblInstanceByParty(altinnStudioRuntimeCookie, partyId, state) {
    var endpoint = config.platformStorage["messageBoxInstances"] + "/" + partyId + "?state=" + state + "&language=nb";
    var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, "platform");
    return http.get(endpoint, params);
};

//Api call to Storage:SBL instances to get an instance by id and return response
export function deleteSblInstance(altinnStudioRuntimeCookie, partyId, instanceId, hardDelete) {
    var endpoint = config.buildStorageUrls(partyId, instanceId, "", "sblinstanceid") + "?hard=" + hardDelete;
    var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, "platform");
    return http.del(endpoint, "", params);
};

//Api call to Storage:SBL instances to restore a soft deleted instance
export function restoreSblInstance(altinnStudioRuntimeCookie, partyId, instanceId) {
    var endpoint = config.buildStorageUrls(partyId, instanceId, "", "sblinstanceid") + "/undelete";
    var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, "platform");
    return http.put(endpoint, "", params);
};

//Api call to Storage:SBL instances to get an instance by id and return response
export function getSblInstanceEvents(altinnStudioRuntimeCookie, partyId, instanceId) {
    var endpoint = config.buildStorageUrls(partyId, instanceId, "", "sblinstanceid") + "/events";
    var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, "platform");
    return http.get(endpoint, params);
};

//Function to hard delete all instances that is passed into the function
export function hardDeleteManyInstances(altinnStudioRuntimeCookie, instances) {
    for (var i = 0; i < instances.length; i++) {
        var instanceIdSplit = instances[i].split("/");
        var partyId = instanceIdSplit[0];
        var instanceId = instanceIdSplit[1];
        deleteSblInstance(altinnStudioRuntimeCookie, partyId, instanceId, "true");
    };
}

//Function to filter app instances based on appName and return instances as an array
export function filterInstancesByAppName(appNames, responseJson) {
    responseJson = JSON.parse(responseJson);
    var instances = [];
    for (var i = 0; i < responseJson.length; i++) {
        if (appNames.includes(responseJson[i].appName)) {
            instances.push(responseJson[i].instanceOwnerId + "/" + responseJson[i].id)
        }
    }
    return instances;
}
