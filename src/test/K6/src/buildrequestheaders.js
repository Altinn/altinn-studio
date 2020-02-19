//Function to determine the headers for a POST/PUT data based on dataType
export function buildHeadersForData(dataType, altinnStudioRuntimeCookie){
    var params = "";
    if (dataType != "default"){
        params = {  headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie,
                                  "Content-Type": "application/octet-stream",
                                  "Content-Disposition": "attachment; filename=test.pdf"}};        
    }
    else{
        params = {  headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie,
                                  "Content-Type": "application/xml"}};     
    };
    return params;
};

//Function to build headers with altinnStudioRuntimeCookie and returns a json object
export function buildHearderWithRuntime(altinnStudioRuntimeCookie){
    var params = {
        headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie}
                };
    return params;
};

//Function to build headers with altinnStudioRuntimeCookie and JSON content-type and returns a json object
export function buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie){
    var params = {
        headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie,
                  "Content-Type": "application/json"}
                };
    return params;
};