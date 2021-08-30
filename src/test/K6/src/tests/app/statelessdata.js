/* 
  Test data required: username, password, app requiring level 2 login (reference app: ttd/stateless-app)
  command to run the test: 
  docker-compose run k6 run /src/tests/app/statelessdata.js -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e appsaccesskey=***  
*/

import { check } from 'k6';
import { addErrorCount } from '../../errorcounter.js';
import * as stateless from '../../api/app/statelessdata.js';
import * as setUpData from '../../setup.js';
import { generateJUnitXML, reportPath } from '../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const appName = __ENV.level2app;
let instanceFormDataXml = open('../../data/apps-test.xml');

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup() {
  var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = {};
  data.RuntimeToken = altinnStudioRuntimeCookie;
  setUpData.clearCookies();
  return data;
}

//Tests for App API: Stateless data
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  var res, success;
  const dataModelBinding = 'OpplysningerOmArbeidstakeren-grp-8819.Skjemainstans-grp-8854.IdentifikasjonsnummerKrav-datadef-33317.value';

  //Test to create a new data object for a stateless app
  res = stateless.getStatelessData(runtimeToken, 'default', appOwner, appName);
  success = check(res, {
    'GET create new stateless data object by type status is 200': (r) => r.status === 200,
    'GET create new stateless data object by type response prefilled': (r) => r.json(dataModelBinding) == '1234567890',
  });
  addErrorCount(success);

  //Test to run calculations on the provided data object and validate the data in the response
  res = stateless.postStatelessData(runtimeToken, 'default', instanceFormDataXml, appOwner, appName);
  success = check(res, {
    'POST update stateless data object status is 200': (r) => r.status === 200,
    'POST update stateless data object data field is updated': (r) => r.json(dataModelBinding) == '1705',
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('statelessdata')] = generateJUnitXML(data, 'app-statelessdata');
  return result;
}
