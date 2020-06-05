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
    return altinnStudioRuntimeCookie;
};

//Test for platform profile and validate response
export default function(data) {
    const runtimeToken = data;

    var userData = setUpData.getUserData(runtimeToken);
    const userId = userData["userId"];
    const ssn = userData["ssn"];

    //Test to fetch userprofile by userid
    var res = profile.getProfile(userId, runtimeToken);    
    var success = check(res, {
      "GET Profile status is 403:": (r) => r.status === 403
    });  
    addErrorCount(success);  

    //Test to fetch userprofile by SSN
    res = profile.postFetchProfileBySSN(ssn, runtimeToken);
    success = check(res, {
        "POST Fetch profile by SSN is 403:": (r) => r.status = 403
    });
    addErrorCount(success);
};