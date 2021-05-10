/* 
  Test data required: username, password, app requiring level 2 login (reference app: ttd/apps-test)
  command to run the test: docker-compose run k6 run /src/tests/app/statelessdata.js 
  -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=***
*/

import { check } from "k6";
import { addErrorCount } from "../../errorcounter.js";
import * as stateless from "../../api/app/statelessdata"
import * as setUpData from "../../setup.js";

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const level2App = __ENV.level2app;
let instanceFormDataXml = open("../../data/" + level2App + ".xml");
let pdfAttachment = open("../../data/test_file_pdf.pdf", "b");


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

    //Test to runs calculations on the provided data object and validate the data in the response
    res = stateless.putDataByType(runtimeToken, "default", instanceFormDataXml, appOwner, level2App);
    success = check(res, {
        "PUT Edit Data by Id status is 200:": (r) => r.status === 200

        // parse data to ensure calculation has run.
    });
    addErrorCount(success);
};

export function handleSummary(data) {
    let result = {};
    result[reportPath("subscriptions")] = generateJUnitXML(data, "platform-events-subscription");
    return result;
};