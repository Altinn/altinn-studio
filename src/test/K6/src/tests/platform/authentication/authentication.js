/* 
    Test data required: username and password
    Command: docker-compose run k6 run src/tests/platform/authentication/authentication.js -e env=*** -e username=*** -e userpwd=*** -e subskey=***
*/

import * as setUpData from "../../../setup.js";

const userName = __ENV.username;
const userPassword = __ENV.userpwd;

export const options = {
  thresholds: {
    "errors": ["count<1"]
  }
};

//Tests for platform authentication
export default function () {
  //Authenticate towards Altinn 2
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  //Authenticate towards Altinn 3
  setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
};
