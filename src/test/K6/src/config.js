// This file inhols baseURLs and endpoints for the APIs
export var baseUrls = {
    at22: "at22.altinn.cloud",
    at23: "at23.altinn.cloud",
    at24: "at24.altinn.cloud",
    tt02: "tt02.altinn.no"
};

//Get values from environment
let environment = __ENV.env;
let appOwner = __ENV.org;
let appName = __ENV.app;
let baseUrl =  baseUrls[environment];

//Altinn API
export var authentication =  {
    authenticationWithPassword: "https://" + baseUrl + "/api/authentication/authenticatewithpassword"
};

//Platform APIs
//Authentication
export var platformAuthentication =  {
    authentication: "https://platform." + baseUrl + "/authentication/api/v1/authentication",
    refresh: "https://platform." + baseUrl + "/authentication/api/v1/refresh"
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


//App APIs
export var appProfile =  {
    user: "https://" + appOwner + ".apps." + baseUrl + "/" + appOwner + "/" + appName + "/api/v1/profile/user"
};