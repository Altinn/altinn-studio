import http from 'k6/http';
import * as config from '../../config.js';
import * as header from '../../buildrequestheaders.js';

//Batch Api calls after instance creation to get app resources like Appmetadata, Formlayoust.json, rulehandler.js, ruleconfiguration.json
export function batchGetAppResources(altinnStudioRuntimeCookie, appOwner, appName) {
  let req, res;
  var requestParams = header.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  req = [
    {
      method: 'get',
      url: config.appApiBaseUrl(appOwner, appName) + config.appResources['servicemetadata'],
      params: requestParams,
    },
    {
      method: 'get',
      url: config.appApiBaseUrl(appOwner, appName) + config.appResources['formlayout'],
      params: requestParams,
    },
    {
      method: 'get',
      url: config.appApiBaseUrl(appOwner, appName) + config.appResources['rulehandler'],
      params: requestParams,
    },
    {
      method: 'get',
      url: config.appApiBaseUrl(appOwner, appName) + config.appResources['ruleconfiguration'],
      params: requestParams,
    },
    {
      method: 'get',
      url: config.appApiBaseUrl(appOwner, appName) + config.appResources['texts'] + 'nb',
      params: requestParams,
    },
    {
      method: 'get',
      url: config.appApiBaseUrl(appOwner, appName) + config.appResources['jsonschema'] + 'default',
      params: requestParams,
    },
  ];
  res = http.batch(req);
  return res;
}

/**
 * Fetch app metadata
 * @param {*} altinnToken
 * @param {*} appOwner
 * @param {*} appName
 * @returns returns the response of the get request
 */
export function getAppMetadata(altinnToken, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.appResources['applicationmetadata'];
  var params = header.buildHearderWithRuntime(altinnToken, 'app');
  return http.get(endpoint, params);
}
