import http from "k6/http";
import * as config from "./config.js";
import {getParties} from "./api/platform/authorization.js";

let userName = __ENV.username;
let userPassword = __ENV.userpwd;

//Request to Authenticate an user with Altinn userName and password and returns ASPXAUTH Cookie
export function authenticateUser(){
    var endpoint =   config.authentication["authenticationWithPassword"];    
    var requestBody = {
        "UserName": userName,
        "UserPassword": userPassword
    };        
    var res = http.post(endpoint, requestBody); 
    const cookieName = ".ASPXAUTH"    
    var cookieValue = (res.cookies[cookieName])[0].value;
    return cookieValue;
};

//Request to Authenticate an user and returns AltinnStudioRuntime Token
export function getAltinnStudioRuntimeToken(aspxauthCookie){
    var endpoint =   config.platformAuthentication["authentication"] + "?goto=" + config.platformAuthentication["refresh"];    
    var params = {
        cookies: {".ASPXAUTH": aspxauthCookie}
    };
    var res = http.get(endpoint,params);     
    return (res.body);
};

//Request to get user data and returns partyId, ssn, userId, orgNr
export function getUserData(altinnStudioRuntimeCookie){
    var endpoint =   config.appProfile["user"];
    var params = {
        headers: {"Authorization": "Bearer " + altinnStudioRuntimeCookie}
    };
    var res = http.get(endpoint,params);
    res = JSON.parse(res.body);
    var userData = {
        "userId": res.userId,
        "ssn": res.party.ssn,
        "partyId": res.partyId
    };
    //get parties and find an Org that an user can represent
    res = getParties(userData["userId"]);
    res = JSON.parse(res.body);
    for(var i=0; i < res.length; i++){
        if(res[i].orgNumber != null){
            userData.orgNumber = res[i].orgNumber;
            break;
            }
        };
    return userData;
};

//Function to clear the cookies under baseurl by setting the expires field to a past date
export function clearCookies(){
    var jar = http.cookieJar();    
    jar.set("https://" + config.baseUrl, "AltinnStudioRuntime", "test", {"expires": "Mon, 02 Jan 2010 15:04:05 MST"});
    jar.set("https://" + config.baseUrl, ".ASPXAUTH", "test", {"expires": "Mon, 02 Jan 2010 15:04:05 MST"});         
};