import { check, sleep } from "k6";
import {Counter} from "k6/metrics";
import * as profile from "../../Apicalls/Platform/profile.js"
import * as setUpData from "../../setup.js";

let ErrorCount = new Counter("errors");

export const options = {
    vus: 1,
    thresholds:{
        "errors": ["rate<0.000001"]
    }
};

//Function to setup data and reurn userData
export function setup(){
    var aspxauthCookie = setUpData.authenticateUser();    
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    var userData = setUpData.getUserData(altinnStudioRuntimeCookie);    
    return userData;
};

//Test for platform profile and validate response
export default function(userData) {
    var userId = userData["userId"];
    var res = profile.getProfile(userId);
    var success = check(res, {
      "GET Profile: status is 200": (r) => r.status === 200,
      "GET Profile: response contains userId": (r) => (JSON.parse(r.body)).userId === userId
  });  
  if (!success){
      ErrorCount.add(1);
  }
  sleep(1);
};