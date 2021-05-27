/* Pre-reqisite for test for prod: 
    1. MaskinPorteTokenGenerator https://github.com/Altinn/MaskinportenTokenGenerator built
    2. Installed appOwner certificate
    3. Send maskinporten token as environment variable: -e maskinporten=token

    Environment variables for test environments: 
    -e tokengenuser=*** -e tokengenuserpwd=*** -e scopes=altinn:serviceowner/instances.read

    This test script sets complete confirmation as app owner on all the instances from a csv file.
    The iteration is shared between the virtual users and each VU runs exactly same number of iternations (maxIter).

    example: k6 run /src/tests/platform/storage/appowner/completeconfirmation.js 
    -e env=test -e appsaccesskey=*** -e maskinporten=token -e vus=**(number of virtual users)
*/

import { check } from 'k6';
import { stopIterationOnFail } from '../../../errorcounter.js';
import * as storageInstances from '../../../api/platform/storage/instances.js';
import * as setUpData from '../../../setup.js';
import Papa from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

const instancesCsvFile = open('../../../data/instances.csv');
const instancesArray = Papa.parse(instancesCsvFile).data; //parsing csv using papaparse
const instancesCount = instancesArray.length;
const maxVus = parseInt(__ENV.vus);
const maxIter = Math.floor(instancesCount / maxVus);

export const options = {
  scenarios: {
    completeconfirm: {
      executor: 'per-vu-iterations',
      iterations: maxIter,
      vus: maxVus,
      maxDuration: '1h30m',
    },
  },
};

//Function to authenticate a app owner, get all archived hardeleted and not complete confirmed instances of an app and return data
export function setup() {
  var altinnStudioRuntimeToken = setUpData.getAltinnTokenForTTD();
  var data = {};
  data.runtimeToken = altinnStudioRuntimeToken;
  data.instances = instancesArray;
  setUpData.clearCookies();
  return data;
}

//Set complete confirmation on all instances from the csv file with the virtual users sent using -e vus=**
export default function (data) {
  const runtimeToken = data['runtimeToken'];
  const instances = data.instances;
  var res, success, partyId, instanceId;

  var uniqueNum = __VU * maxIter - maxIter + __ITER;
  uniqueNum = uniqueNum > instances.length ? Math.floor(uniqueNum % instances.length) : uniqueNum;

  //Get instance ids and separate party id and instance id
  try {
    instanceId = instances[uniqueNum].toString();
    instanceId = instanceId.split('/');
    partyId = instanceId[0];
    instanceId = instanceId[1];
  } catch (error) {
    stopIterationOnFail('Testdata missing', false, null);
  }

  //Complete confirm the app instance as an appOwner
  res = storageInstances.postCompleteConfirmation(runtimeToken, partyId, instanceId);
  success = check(res, {
    'Instance is confirmed complete': (r) => r.status === 200,
  });
  stopIterationOnFail('Instance is not confirmed complete', success, res);
}
