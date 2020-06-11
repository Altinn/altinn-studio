// This file inhols baseURLs and endpoints for the APIs
export var baseUrls = {
    at22: "at22.altinn.cloud",
    at23: "at23.altinn.cloud",
    at24: "at24.altinn.cloud",
    tt02: "tt02.altinn.no",
    yt01: "yt01.altinn.cloud",
    prod: "altinn.no"
};

//Get values from environment
let environment = (__ENV.env).toLowerCase();
export let baseUrl =  baseUrls[environment];

//Altinn API
export var authentication =  {
    authenticationWithPassword: "https://" + baseUrl + "/api/authentication/authenticatewithpassword"
};

//Platform APIs
//Authentication
export var platformAuthentication =  {
    "authentication": "https://platform." + baseUrl + "/authentication/api/v1/authentication",
    "refresh": "https://platform." + baseUrl + "/authentication/api/v1/refresh",
    "maskinporten": "https://platform." + baseUrl + "/authentication/api/v1/exchange/maskinporten",
    "idporten": "https://platform." + baseUrl + "/authentication/api/v1/exchange/id-porten"
};

//Profile
export var platformProfile = {
    "users": "https://platform." + baseUrl + "/profile/api/v1/users/"
};

//Register
export var platformRegister = {
    "organizations": "https://platform." + baseUrl + "/register/api/v1/organizations/",
    "parties": "https://platform." + baseUrl + "/register/api/v1/parties/",
    "persons": "https://platform." + baseUrl + "/register/api/v1/persons",
    "lookup": "https://platform." + baseUrl + "/register/api/v1/parties/lookup",
    "persons": "https://platform." + baseUrl + "/register/api/v1/parties/lookupobject"
};

//Authorization
export var platformAuthorization = {
    "decision": "https://platform." + baseUrl + "/authorization/api/v1/decision",
    "parties": "https://platform." + baseUrl + "/authorization/api/v1/parties",
    "policy": "https://platform." + baseUrl + "/authorization/api/v1/policies",
    "roles": "https://platform." + baseUrl + "/authorization/api/v1/roles"    
};

//PDF
export var platformPdf = {
    "generate": "https://platform." + baseUrl + "/pdf/api/v1/generate"    
};

//Receipt
export var platformReceipt = {
    "receipt": "https://platform." + baseUrl + "/receipt/api/v1/instances" 
};

//Platform Storage
export var platformStorage = {
    "applications": "https://platform." + baseUrl + "/storage/api/v1/applications",
    "instances": "https://platform." + baseUrl + "/storage/api/v1/instances",
    "messageBoxInstances": "https://platform." + baseUrl + "/storage/api/v1/sbl/instances",
};

//Function to build endpoints in storage with instanceOwnerId, instanceId, dataId, type
//and returns the endpoint
export function buildStorageUrls(instanceOwnerId, instanceId, dataId, type){
    var value = "";
    switch(type){
        case "instanceid":
            value = platformStorage["instances"] + "/" + instanceOwnerId + "/" + instanceId;
            break;
        case "dataid":
            value = platformStorage["instances"] + "/" + instanceOwnerId + "/" + instanceId + "/data/" + dataId;
            break;
        case "dataelements":
            value = platformStorage["instances"] + "/" + instanceOwnerId + "/" + instanceId + "/dataelements";
            break;
        case "events":
            value = platformStorage["instances"] + "/" + instanceOwnerId + "/" + instanceId + "/events";
            break;
        case "sblinstanceid":
            value = platformStorage["messageBoxInstances"] + "/" + instanceOwnerId + "/" + instanceId;
            break;
        case "process":
            value = platformStorage["instances"] + "/" + instanceOwnerId + "/" + instanceId + "/process";
            break;
        case "confirmdownloadall":
            value = platformStorage["instances"] + "/" + instanceOwnerId + "/" + instanceId + "/dataelements/confirmDownload";
            break;
        case "completeconfirmation":
            value = platformStorage["instances"] + "/" + instanceOwnerId + "/" + instanceId + "/complete";
            break;
    };
    return value;
};

//App APIs
export function appApiBaseUrl(appOwner, appName){
    var url = "https://" + appOwner + ".apps." + baseUrl + "/" + appOwner + "/" + appName;
    return url;
};

//Validate Instantiation
export var appValidateInstantiation = "/api/v1/parties/validateInstantiation";

//App Profile
export var appProfile =  {
    "user": "/api/v1/profile/user"
};

//Function to build endpoints in App Api with instanceOwnerId, instanceId, dataId, type
//and returns the endpoint
export function buildAppApiUrls(instanceOwnerId, instanceId, dataId, type){
    var value = "";
    switch(type){
        case "instanceid":
            value = "/instances/" + instanceOwnerId + "/" + instanceId;
            break;
        case "dataid":
            value = "/instances/" + instanceOwnerId + "/" + instanceId + "/data/" + dataId;
            break;        
        case "process":
            value = "/instances/" + instanceOwnerId + "/" + instanceId + "/process";
            break;        
    };
    return value;
};


//App Resources
export var appResources = {
    "textresources" : "/api/textresources",
    "applicationmetadata" : "/api/v1/applicationmetadata",
    "servicemetadata": "/api/metadata/ServiceMetaData",
    "formlayout": "/api/resource/FormLayout.json",
    "rulehandler": "/api/resource/RuleHandler.js",
    "ruleconfiguration": "/api/resource/RuleConfiguration.json"
};

//App Authorization
export var appAuthorization =  {
    "currentparties": "/api/authorization/parties/current?returnPartyObject=true"
};