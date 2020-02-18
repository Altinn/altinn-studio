import { check, sleep } from "k6";
import {Counter} from "k6/metrics";
import * as application from "../../Apicalls/Storage/applications.js"
import * as setUpData from "../../setup.js";

let ErrorCount = new Counter("errors");
let appOwner = __ENV.org;
let level2App = __ENV.level2app;
let testApp = __ENV.testapp;
let metadata = open("../../Data/appmetadata.json");

export const options = {
    thresholds:{
        "errors": ["rate<0.000001"]
    }
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup(){
    var aspxauthCookie = setUpData.authenticateUser();    
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);    
    return altinnStudioRuntimeCookie;
};


//Tests for platform Storage: Applications
export default function(data) {
    var runtimeToken = data;

    //Test Platform: Storage: Get All applicaions under an appOwner
    var res = application.getAllApplications(runtimeToken, appOwner);    
    var success = check(res, {
      "GET All Apps under an Org: status is 200": (r) => r.status === 200,
      "GET All Apps under an Org: List is not empty": (r) => (JSON.parse(r.body)).applications.length != 0
    });  
    if (!success){
      ErrorCount.add(1);
    };
    sleep(1); 

    //Test Platform: Storage: Get application by app name and validate response
    res = application.getAppByName(runtimeToken, appOwner, level2App);
    var appId = appOwner + "/" + level2App;
    success = check(res, {
      "GET App by Name: status is 200": (r) => r.status === 200,
      "GET App by Name: Metadata is OK": (r) => (JSON.parse(r.body)).id === appId
    });  
    if (!success){
      ErrorCount.add(1);
    };
    sleep(1);

    //Test Platform: Storage: Post create an app with metadata
    //expected: 403 as it is not possible to create App with an user token
    res = application.postCreateApp(runtimeToken, appOwner, testApp, metadata);    
    success = check(res, {
      "POST Create App: status is 403": (r) => r.status === 403      
    });  
    if (!success){
      ErrorCount.add(1);
    };
    sleep(1); 

    //Api call to Platform: Storage: PUT Edit an app metadata
    //expected: 200 as response code
    res = application.putEditApp(runtimeToken, appOwner, testApp, metadata);    
    success = check(res, {
      "PUT Edit App: status is 200": (r) => r.status === 200      
    });  
    if (!success){
      ErrorCount.add(1);
    };
    sleep(1); 
};