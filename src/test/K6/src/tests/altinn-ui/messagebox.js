/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run /src/tests/altinn-ui/messagebox.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check } from 'k6';
import * as appInstances from '../../api/app/instances.js';
import * as altinnUi from '../../api/altinn-ui/messagebox.js';
import * as setUpData from '../../setup.js';
import { addErrorCount } from '../../errorcounter.js';
import { generateJUnitXML, reportPath } from '../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const appName = __ENV.level2app;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return aspxAuth cookie
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnToken = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnToken, appOwner, appName);
  data.aspxAuthCookie = aspxauthCookie;
  setUpData.clearCookies();
  appInstances.postInstance(altinnToken, data['partyId'], appOwner, appName);
  return data;
}

//Tests for Altinn Ui: Messagebox
export default function (data) {
  const aspxAuthCookie = data['aspxAuthCookie'];
  var res, success;

  res = altinnUi.loadAltinnInbox(aspxAuthCookie);
  success = check(res, {
    'Load Altinn inbox - status is 200': (r) => r.status === 200,
    'Altinn 3 instances are loaded': (r) => r.html().find("div[data-load-url*='AltinnIIIActiveElementInfo']").size() > 0,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('altinnMessagebox')] = generateJUnitXML(data, 'altinn-ui-messagebox');
  return result;
}
