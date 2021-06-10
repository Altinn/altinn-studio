/*  Environment variables for test environments: 
    -e tokengenuser=*** -e tokengenuserpwd=*** -e scopes=altinn:serviceowner/instances.read

    This test script sets complete confirmation as app owner on all the archived instances from today from a specific app.

    example: k6 run /src/tests/app/appowner/complete-instances.js 
    -e env=test -e appsaccesskey=*** -e maskinporten=token
*/

import { check } from 'k6';
import * as storageInstances from '../../../api/platform/storage/instances.js';
import * as appInstances from '../../../api/app/instances.js';
import * as setUpData from '../../../setup.js';
import * as support from '../../../support.js';
import { addErrorCount } from '../../../errorcounter.js';

const appOwner = __ENV.org;
const appName = __ENV.level2app;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
};

export function setup() {
  var altinnStudioRuntimeToken = setUpData.getAltinnTokenForTTD();
  var data = {};
  data.runtimeToken = altinnStudioRuntimeToken;
  return data;
}

export default function (data) {
  const runtimeToken = data['runtimeToken'];

  var res, success;

  var filters = {
    appId: appOwner + '/' + appName,
    excludeConfirmedBy: appOwner,
    created: `gt:${support.todayDateInISO()}`,
    'status.isArchived': 'true',
  };

  res = storageInstances.getAllinstancesWithFilters(runtimeToken, filters);

  if (res.json('count') > 0 && res.json('instances').length > 0) {
    var instances = res.json('instances');
    instances.forEach((instance) => {
      var instanceId = instance.id.split('/');
      res = appInstances.postCompleteConfirmation(runtimeToken, instanceId[0], instanceId[1], appOwner, appName);
      success = check(res, {
        'Instance is confirmed complete': (r) => r.status === 200,
      });
      addErrorCount(success);
    });
  }
}
