import http from "k6/http";
import * as config from "../../config.js";
import * as header from "../../buildrequestheaders.js"

//Api call to Storage:Instances to create an app instance and returns response
export function postInstance(altinnStudioRuntimeCookie, partyId, appOwner, level2App, instanceJson){
    var appId = appOwner + "/" + level2App;
    var endpoint = config.platformStorage["instances"] + "?appId=" + appId;
    var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie, "platform");
    var requestbody = JSON.stringify(buildInstanceInputJson(instanceJson, appId, partyId));
    return http.post(endpoint, requestbody, params);
};

//Function to build input json for creation of instance with app, instanceOwner details and returns a JSON object
function buildInstanceInputJson(instanceJson, appId, partyId){
    instanceJson = JSON.parse(instanceJson);
    instanceJson.instanceOwner.partyId = partyId;
    instanceJson.appId = appId;
    return instanceJson;
};

//Api call to Storage:Instances to get an instance by id and return response
export function getInstanceById(altinnStudioRuntimeCookie, partyId, instanceId){
    var endpoint = config.buildStorageUrls(partyId, instanceId, "", "instanceid");
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, "platform");    
    return http.get(endpoint, params);
};

//Api call to Storage:Instances to get all instances under a party id and return response
export function getAllinstances(altinnStudioRuntimeCookie, partyId){
    var endpoint = config.platformStorage["instances"] + "?instanceOwner.partyId=" + partyId;
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, "platform");    
    return http.get(endpoint, params);
};

//Api call to Storage:Instances to edit an instance by id and return response
export function putInstanceById(altinnStudioRuntimeCookie, partyId, instanceId){
    var endpoint = config.buildStorageUrls(partyId, instanceId, "", "instanceid");
    var params = header.buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie, "platform");
    var timeStamp = new Date();
    var requestbody = { "dueBefore":  timeStamp.toISOString()};
    requestbody = JSON.stringify(requestbody);    
    return http.put(endpoint, requestbody, params);
};

//Function to clip out the instance owner id and return only instance id
export function findInstanceId(responseBody){
    var instanceId = (JSON.parse(responseBody)).id;
    instanceId = instanceId.split('/');
    instanceId = instanceId[1];
    return instanceId;
};