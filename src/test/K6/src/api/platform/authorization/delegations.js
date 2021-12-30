import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';

export function getPolicies(altinnToken, appOwner, appName) {
  var endpoint = config.platformAuthorization.getPolicies;
  var params = header.buildHearderWithRuntimeandJson(altinnToken, 'platform');
  var body = [
    [
      {
        id: 'urn:altinn:org',
        value: appOwner,
      },
      {
        id: 'urn:altinn:app',
        value: appName,
      },
    ],
  ];
  return http.request('GET', endpoint, body, params);
}
