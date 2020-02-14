import http from "k6/http";
import * as config from "../../config.js";

//Request to get an org by org number and returns the response
export function getParties(userId){    
    var endpoint =   config.platformAuthorization["parties"] + "?userId=" + userId;    
    return http.get(endpoint);
};