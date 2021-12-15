/* 
    Test data required: username and password, deployed app that requires level 2 login (reference app: ttd/apps-test)
    Command: docker-compose run k6 run /src/tests/altinn-ui/messagebox.js 
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=*** -e sblaccesskey=***
*/

import { check, sleep } from 'k6';
import * as appInstances from '../../api/app/instances.js';
import * as appResources from '../../api/app/resources.js';
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

//Function to setup data and return aspxAuth cookie, app title and partyid
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnToken = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var appTitle = appResources.getAppMetadata(altinnToken, appOwner, appName);
  appTitle = appTitle.json('title.nb');
  var data = setUpData.getUserData(altinnToken, appOwner, appName);
  data.aspxAuthCookie = aspxauthCookie;
  data.appTitle = appTitle;
  setUpData.clearCookies();
  appInstances.postInstance(altinnToken, data['partyId'], appOwner, appName);
  return data;
}

//Tests for Altinn Ui: Messagebox
export default function (data) {
  const aspxAuthCookie = data['aspxAuthCookie'];
  const partyId = data['partyId'];
  const appTitle = data['appTitle'];
  var res, success, searchCriteria;

  sleep(5);
  res = altinnUi.loadAltinnInbox(aspxAuthCookie, partyId);
  success = check(res, {
    'Load Altinn inbox - status is 200': (r) => r.status === 200,
    'Load Altinn inbox - elements are loaded': (r) => r.html().find('.elementHeader').size() > 0,
  });
  addErrorCount(success);

  searchCriteria = {
    'ElementSearch.Title': appTitle,
  };
  res = altinnUi.searchMessageBox(aspxAuthCookie, partyId, searchCriteria);
  success = check(res, {
    'Search messagebox - status is 200': (r) => r.status === 200,
    'Search messagebox - Altinn 3 instances are fetched': (r) => r.html().find("div[data-load-url*='AltinnIIIActiveElementInfo']").size() > 0,
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('altinnMessagebox')] = generateJUnitXML(data, 'altinn-ui-messagebox');
  return result;
}
