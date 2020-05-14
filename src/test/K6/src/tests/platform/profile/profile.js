import { check } from "k6";
import {addErrorCount} from "../../../errorcounter.js";
import * as profile from "../../../api/platform/profile.js"
import * as setUpData from "../../../setup.js";

const userName = __ENV.username;
const userPassword = __ENV.userpwd;

export const options = {    
    thresholds:{
        "errors": ["count<1"]
    }
};

//Function to setup data and return userData
export function setup(){
    var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);    
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    setUpData.clearCookies();
    var data = setUpData.getUserData(altinnStudioRuntimeCookie);   
    data.RuntimeToken = altinnStudioRuntimeCookie; 
    return data;
};

//Test for platform profile and validate response
export default function(data) {
    const userId = data["userId"];
    const ssn = data["ssn"];
    const runtimeToken = data["RuntimeToken"];

    //Test to fetch userprofile by userid
    var res = profile.getProfile(userId, runtimeToken);    
    var success = check(res, {
      "GET Profile status is 200:": (r) => r.status === 200,
      "GET Profile response contains userId:": (r) => (JSON.parse(r.body)).userId === userId
    });  
    addErrorCount(success);  

    //Test to fetch userprofile by SSN
    res = profile.postFetchProfileBySSN(ssn, runtimeToken);
    success = check(res, {
        "POST Fetch profile by SSN:": (r) => r.status = 200,
        "POST Fetch profile by SSN contains userId:": (r) => (JSON.parse(r.body)).userId === userId
    });
    addErrorCount(success);
};