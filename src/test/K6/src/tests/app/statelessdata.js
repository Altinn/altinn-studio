/* 
  Test data required: username, password, app requiring level 2 login (reference app: ttd/apps-test)
  command to run the test: 
  docker-compose run k6 run /src/tests/app/statelessdata.js -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=***  
*/

import { check } from "k6";
import { addErrorCount } from "../../errorcounter.js";
import * as stateless from  "../../api/app/statelessdata.js"
import * as setUpData from "../../setup.js";
import { generateJUnitXML, reportPath } from "../../report.js"

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
let instanceFormDataXml = open("../../data/" + level2App + ".xml");

export const options = {
    thresholds: {
        "errors": ["count<1"]
    }
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup() {
    var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, level2App);
    data.RuntimeToken = altinnStudioRuntimeCookie;
    setUpData.clearCookies();
    
    return data;
};


//Tests for App API: Stateless data
export default function (data) {
    const runtimeToken = data["RuntimeToken"];
    var res, success; 

    //Test to run calculations on the provided data object and validate the data in the response
    res = stateless.putDataByType(runtimeToken, "default", instanceFormDataXml, appOwner, level2App);
    success = check(res, {
        "PUT update stateless data object status is 200:": (r) => r.status === 200,
        "PUT update stateless data object data field is updated": (r) => r.json("OpplysningerOmArbeidstakeren-grp-8819.Skjemainstans-grp-8854.IdentifikasjonsnummerKrav-datadef-33317.value") == "1705"    

        // parse data to ensure calculation has run.
    });
    addErrorCount(success);

    //Test to create a new data object for a stateless app
    res = stateless.postData(runtimeToken, "default", appOwner, level2App);
    success = check(res, {
        "POST create new stateless data object by type status is 200:": (r) => r.status === 200,
        "POST create new stateless data object by type response is not empty": (r) => r.json("OpplysningerOmArbeidstakeren-grp-8819.Skjemainstans-grp-8854.IdentifikasjonsnummerKrav-datadef-33317.value") == "1234567890"    
    });
    
   console.log(JSON.stringify(res.body));
    addErrorCount(success);    
};

export function handleSummary(data) {
    let result = {};
    result[reportPath("statelessdata")] = generateJUnitXML(data, "app-statelessdata");
    return result;
};