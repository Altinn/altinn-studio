/* 
    Test data: a json file named as ex: users_prod.json with user data in below format in the K6/src/data folder and 
    instances created using RF-0002 script
  [
    {
        "username": "",
        "password": "",
        "partyid": ""
    }
  ]
    Command: docker-compose run k6 run src/tests/platform/storage/sblloadinstances.js
    -e env=*** -e executor=constantvus -e vus=5 -e iter=10 -e duration=10m -e stages="10s:1,40s:5"
    Executor type and required params
    type: constantvus params: vus, duration
    type: sharediter params: vus, iter, duration
    type: ramp params: stages
*/

import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import * as sbl from '../../../api/platform/storage/messageboxinstances.js';
import * as setUpData from '../../../setup.js';
import { addErrorCount } from '../../../errorcounter.js';
import { k6scenarios } from '../../../scenarios.js';

const environment = __ENV.env.toLowerCase();
const fileName = 'users_' + environment + '.json';
const users = JSON.parse(open('../../../data/' + fileName));
const usersCount = users.length;
const executor = __ENV.executor;
const vus = __ENV.vus ? parseInt(__ENV.vus) : 1;
const iterations = __ENV.iter ? parseInt(__ENV.iter) : 1;
const maxDuration = __ENV.duration ? __ENV.duration : '10m';
const stages = __ENV.stages ? __ENV.stages : '10s:1';

const scenario = k6scenarios(executor, vus, iterations, maxDuration, stages);

export let TrendRTT = new Trend('LoadInstances');
let SlowResponse = new Counter('SlowResponses');

export const options = {
  thresholds: {
    errors: ['count<100'],
    LoadInstances: ['p(95)<2000', 'avg<1500'],
  },
  scenarios: scenario,
};

//Load test for SBL
export default function () {
  var userNumber = (__VU - 1) % usersCount;
  var res, success;

  try {
    var userSSN = users[userNumber].username;
    var userPwd = users[userNumber].password;
  } catch (error) {
    stopIterationOnFail('Testdata missing', false, null);
  }

  var aspxauthCookie = setUpData.authenticateUser(userSSN, userPwd);
  const runtimeToken = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  setUpData.clearCookies();
  const partyId = users[userNumber].partyid;

  //Test to get active instances for a party from storage: SBL and validate the response
  var filters = {
    language: 'nb',
    'instanceOwner.partyId': partyId,
    includeActive: 'true',
  };
  res = sbl.searchSblInstances(runtimeToken, filters);
  success = check(res, {
    'GET active Instance by Party status is 200': (r) => r.status === 200,
  });
  TrendRTT.add(res.timings.duration);
  SlowResponse.add(!(res.timings.duration < 2000));
  addErrorCount(success);
}
