import http from "k6/http";
import * as config from "../../config.js";

//Request to get user profile by user id and returns the response
export function getProfile(userId){
    var endpoint = config.platformProfile["users"] + userId;
    var res = http.get(endpoint);
    return res;
};