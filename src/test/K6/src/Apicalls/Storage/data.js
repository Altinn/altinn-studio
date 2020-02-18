import http from "k6/http";
import * as config from "../../config.js";

//Api call to Platform:Storage to upload a data to an instance and returns the response
export function postdata(altinnStudioRuntimeCookie, partyId, instanceId, dataType, instanceData){
    var endpoint = config.buildStorageUrls(partyId, instanceId, "", "instanceid") + "/data?dataType=" + dataType;    
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
    
    return http.post(endpoint, instanceData, params);    
};
