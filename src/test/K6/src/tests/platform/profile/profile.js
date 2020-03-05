import { check, sleep } from "k6";
import {addErrorCount} from "../../../errorcounter.js";
import * as profile from "../../../api/platform/profile.js"
import * as setUpData from "../../../setup.js";

export const options = {    
    thresholds:{
        "errors": ["rate<0.000001"]
    }
};

//Function to setup data and return userData
export function setup(){
    var aspxauthCookie = setUpData.authenticateUser();    
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    var data = setUpData.getUserData(altinnStudioRuntimeCookie);   
    data.RuntimeToken = altinnStudioRuntimeCookie; 
    return data;
};

//Test for platform profile and validate response
export default function(data) {
    const userId = data["userId"];
    const runtimeToken = data["RuntimeToken"];
    var res = profile.getProfile(userId, runtimeToken);    
    var success = check(res, {
      "GET Profile status is 200:": (r) => r.status === 200,
      "GET Profile response contains userId:": (r) => (JSON.parse(r.body)).userId === userId
  });  
  addErrorCount(success);  
};