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
export function getAllinstancesByPartyId(altinnStudioRuntimeCookie, partyId){
    var endpoint = config.platformStorage["instances"] + "?instanceOwner.partyId=" + partyId;
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, "platform");    
    return http.get(endpoint, params);
};

//Api call to Storage:Instances to get all instances under a party id and return response
export function getInstancesByOrgAndApp(altinnStudioRuntimeCookie, appOwner, appName, isArchived){
    var endpoint = config.platformStorage["instances"] + "?org=" + appOwner + "&appId=" + appOwner + "/" + appName + "&process.isComplete=" + isArchived;
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, "platform");    
    return http.get(endpoint, params);
};

//Function to clip out the instance owner id and return only instance id
export function findInstanceId(responseBody){
    var instanceId = (JSON.parse(responseBody)).id;
    instanceId = instanceId.split('/');
    instanceId = instanceId[1];
    return instanceId;
};

//Function to find all the archived app instances for an appOwner for a specific app and returns instance id as an array
export function findAllArchivedInstances(altinnStudioRuntimeCookie, appOwner, appName){
    var allInstances = getInstancesByOrgAndApp(altinnStudioRuntimeCookie, appOwner, appName, "true");
    var params = header.buildHeaderWithRuntimeAsCookie(altinnStudioRuntimeCookie, "platform");
    allInstances = JSON.parse(allInstances.body);
    let archivedInstances = findArchivedNotDeltedInstances(allInstances.instances);
    while(allInstances.next !== null){
        allInstances = http.get(allInstances.next, params);
        allInstances = JSON.parse(allInstances.body);
        var moreInstances = findArchivedNotDeltedInstances(allInstances.instances);
        archivedInstances = archivedInstances.concat(moreInstances);
    };
    return archivedInstances;
};

//Function to build an array with instances that are not deleted from an json response
function findArchivedNotDeltedInstances(instancesArray){
    var archivedInstances = [];
    for(var i = 0; i < instancesArray.length ;  i++){
        if(!("softDeleted" in instancesArray[i].status)){
            archivedInstances.push(instancesArray[i].id);
        }
    };
    return archivedInstances;
};

//API call to platform:storage to completeconfirmation on the instance by an appOwner
export function postCompleteConfirmation(altinnStudioRuntimeCookie, partyId, instanceId){
    var endpoint = config.buildStorageUrls(partyId, instanceId, "", "completeconfirmation");
    var params = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, "platform");    
    return http.post(endpoint, null , params);
};