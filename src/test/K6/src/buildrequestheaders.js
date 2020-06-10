let subscriptionKey = __ENV.subskey;
let environment = __ENV.env;
let sblAccessSubscriptionKey = __ENV.sblaccesskey;

//Function to determine the headers for a POST/PUT data based on dataType
export function buildHeadersForData(dataType, altinnStudioRuntimeCookie, api){
    var params = {};
    if (isGuid(dataType)){
        params = {  headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie,
                                  "Content-Type": "application/octet-stream",
                                  "Content-Disposition": "attachment; filename=test.pdf"},
                    timeout: 300000
                };        
    }
    else{
        params = {  headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie,
                                  "Content-Type": "application/xml"}};     
    };
    params = addSubscriptionKey(params, subscriptionKey, api);
    return params;
};

//Function to build headers with altinnStudioRuntimeCookie and returns a json object
export function buildHearderWithRuntime(altinnStudioRuntimeCookie, api){
    var params = {
        headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie}
        };
    params = addSubscriptionKey(params, subscriptionKey, api);    
    return params;
};

//Function to build headers with altinnStudioRuntimeCookie for storage/sbl api endpoints and returns a json object
export function buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, api){
    var params = {
        headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie}
        };
    params = addSubscriptionKey(params, sblAccessSubscriptionKey, api);    
    return params;
};

//Function to build headers with altinnStudioRuntimeCookie and JSON content-type and returns a json object
export function buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie, api){
    var params = {
        headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie,
                  "Content-Type": "application/json"}
        };
    params = addSubscriptionKey(params, subscriptionKey, api);
    return params;
};

//Function to build headers with .aspxauth cookie
export function buildHeaderWithAspxAuth(aspxauthCookie, api){
    var params = {
        cookies: {".ASPXAUTH": aspxauthCookie}
    };    
    params = addSubscriptionKey(params, subscriptionKey, api);     
    return params;
};

//Function to build headers with .aspxauth cookie
export function buildHeaderWithJson(api){
    var params = {
        headers: {            
            "Content-Type": "application/json"            
        }    
    };  
    params = addSubscriptionKey(params, subscriptionKey, api);     
    return params;
};

//Function to build headers with altinnstudioruntime as cookie and returns the response
export function buildHeaderWithRuntimeAsCookie(altinnStudioRuntimeCookie, api){
    var params = {
        "cookies": {
            "AltinnStudioRuntime": altinnStudioRuntimeCookie
        }
    };
    params = addSubscriptionKey(params, subscriptionKey, api);
    return params;
};

//Function to build a request header only with subscription key
export function buildHeaderWithSubsKey(api){
    var params = {};  
    params = addSubscriptionKey(params, subscriptionKey, api);
    return params;
};

//Check if a string is a guid
export function isGuid(stringToTest) {
    var regexGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regexGuid.test(stringToTest);
};

//Function to add subscription key to the header when sent as env variable from command line
//and env is YT01 or TT02 and endpoint is a platform endpoint
function addSubscriptionKey(params, subscriptionKey, api){   
    if((environment == "yt01" || environment == "tt02" || environment == "prod") && subscriptionKey != null && api =="platform"){                
        if(params["headers"] == null){
            params["headers"]={};            
        };
        params.headers["Ocp-Apim-Subscription-Key"] = subscriptionKey;
    };    
    return params;
};