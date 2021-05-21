/* 
    Pre-reqisite for test: 
    1. MaskinPorteTokenGenerator https://github.com/Altinn/MaskinportenTokenGenerator built
    2. Installed appOwner certificate
    3. Send maskinporten token as environment variable: -e maskinporten=token

    Environment variables for test environments: 
    -e tokengenuser=*** -e tokengenuserpwd=*** -e scopes=altinn:serviceowner/instances.read

    This test script is to verify that get instances endpoint in storage works with a variety of filters
    Test data required: maskinporten token
    Command: docker-compose run k6 run /src/tests/platform/appowner/getinstances5482.js -e env=tt02 -e maskinporten=token
*/

import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as instances from '../../../api/platform/storage/instances.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const appOwner = 'ttd';
const app = 'testcase-5482';

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return AltinnstudioRuntime Token
export function setup() {
  var altinnStudioRuntimeCookie = setUpData.getAltinnTokenForTTD();
  var data = {};
  data.RuntimeToken = altinnStudioRuntimeCookie;
  return data;
}

// Tests for platform Storage: Instances for an appowner
export default function (data) {
  const runtimeToken = data['RuntimeToken'];
  var res, success;

  //Test to get instances with filter on appId. Count expected to be 20.
  var filters = {
    appId: appOwner + '/' + app,
  };
  res = instances.getAllinstancesWithFilters(runtimeToken, filters);
  success = check(res, {
    'GET Instances filter on appId Count should to be 20': (r) => {
      var responseInstances = r.json('instances');
      return responseInstances.length == 20;
    },
  });
  addErrorCount(success);

  // Test to get instances with filter on appId and exclude confirmed by app owner. Count should to be 15.
  filters = {
    appId: appOwner + '/' + app,
    excludeConfirmedBy: appOwner,
  };

  res = instances.getAllinstancesWithFilters(runtimeToken, filters);
  success = check(res, {
    'GET Instances filter on appId and exclude confirmed by Count should to be 15': (r) => {
      var responseInstances = r.json('instances');
      return responseInstances.length == 15;
    },
  });
  addErrorCount(success);

  // Test to get instances with filter on appId and process complete. Count should to be 10.
  filters = {
    appId: appOwner + '/' + app,
    'process.isComplete': true,
  };

  res = instances.getAllinstancesWithFilters(runtimeToken, filters);
  success = check(res, {
    'GET Instances filter  on appId and process complete Count should to be 10': (r) => {
      var responseInstances = r.json('instances');
      return responseInstances.length == 10;
    },
  });
  addErrorCount(success);

  // Test to get instances with filter on appId, process complete and exclude confirmed by app owner. Count should to be 5.
  filters = {
    appId: appOwner + '/' + app,
    excludeConfirmedBy: appOwner,
    'process.isComplete': true,
  };

  res = instances.getAllinstancesWithFilters(runtimeToken, filters);
  success = check(res, {
    'GET Instances filter on appId process complete and exclude confirmed by app owner Count should to bee 5': (r) => {
      var responseInstances = r.json('instances');
      return responseInstances.length == 5;
    },
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('appownerGetInstances5482')] = generateJUnitXML(data, 'platform-GetInstances5482');
  return result;
}
