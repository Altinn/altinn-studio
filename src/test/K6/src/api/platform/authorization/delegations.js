import http from 'k6/http';
import * as config from '../../../config.js';
import * as header from '../../../buildrequestheaders.js';

/**
 * Retrieve policy of an app in json format
 * @param {*} altinnToken authorization token
 * @param {*} appOwner
 * @param {*} appName
 * @returns return response of GET request
 */
export function getPolicies(appOwner, appName) {
  var endpoint = config.platformAuthorization.getPolicies;
  var params = header.buildHeaderWithJson('platform');
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
  return http.post(endpoint, JSON.stringify(body), params);
}
