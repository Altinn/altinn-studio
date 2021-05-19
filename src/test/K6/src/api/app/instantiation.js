import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';

//Batch Api calls before creating an app instance
export function beforeInstanceCreation(altinnStudioRuntimeCookie, partyId, appOwner, appName) {
  let req, res;
  var requestParams = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  req = [
    {
      method: 'get',
      url: config.appApiBaseUrl(appOwner, appName) + config.appProfile['user'],
      params: requestParams,
    },
    {
      method: 'get',
      url: config.appApiBaseUrl(appOwner, appName) + config.appResources['applicationmetadata'],
      params: requestParams,
    },
    {
      method: 'get',
      url: config.appApiBaseUrl(appOwner, appName) + config.appAuthorization['currentparties'],
      params: requestParams,
    },
    {
      method: 'post',
      url: config.appApiBaseUrl(appOwner, appName) + config.appValidateInstantiation + '?partyId=' + partyId,
      params: requestParams,
    },
  ];
  res = http.batch(req);
  return res;
}
