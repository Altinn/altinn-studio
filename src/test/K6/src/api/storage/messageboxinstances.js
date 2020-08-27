import http from "k6/http";
import * as config from "../../config.js";
import * as header from "../../buildrequestheaders.js"

//Api call to Storage:SBL instances to get an instance by id and return response
export function getSblInstanceById(altinnStudioRuntimeCookie, partyId, instanceId) {
    var endpoint = config.buildStorageUrls(partyId, instanceId, "", "sblinstanceid");
    var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, "platform");
    return http.get(endpoint, params);
};

//Api call to Storage:SBL instances to get an instance for a partyid and return response
export function getSblInstanceByParty(altinnStudioRuntimeCookie, partyId) {
    var endpoint = config.platformStorage["messageBoxInstances"] + "/" + partyId + "?state=active&language=nb";
    var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, "platform");
    return http.get(endpoint, params);
};

//Api call to Storage:SBL instances to get an instance by id and return response
export function deleteSblInstance(altinnStudioRuntimeCookie, partyId, instanceId, hardDelete) {
    var endpoint = config.buildStorageUrls(partyId, instanceId, "", "sblinstanceid") + "?hard=" + hardDelete;
    var params = header.buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, "platform");
    params.timeout = 120000;
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
export function hardDeleteManyInstances(altinnStudioRuntimeCookie, instances, instancesCount) {
    for (var i = 0; i < instancesCount; i++) {
        var partyId = JSON.parse(instances)[i].instanceOwnerId;
        var instanceId = JSON.parse(instances)[i].id;
        deleteSblInstance(altinnStudioRuntimeCookie, partyId, instanceId, "true");
    };        
}
