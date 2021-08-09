import http from 'k6/http';
import * as config from '../../config.js';

/**
 * Batch Api calls to get toolkits from AltinnCDN
 * @returns response of all http get requests
 */
export function getToolkits() {
  let req, res;
  req = [
    {
      method: 'get',
      url: config.altinnCdn.toolkits['altinn-no-bold.css'],
    },
    {
      method: 'get',
      url: config.altinnCdn.toolkits['altinn-no-regular.css'],
    },
    {
      method: 'get',
      url: config.altinnCdn.toolkits['altinn-studio.css'],
    },
    {
      method: 'get',
      url: config.altinnCdn.toolkits['altinn-app-frontend.js'],
    },
    {
      method: 'get',
      url: config.altinnCdn.toolkits['altinn-app-frontend.css'],
    },
  ];
  res = http.batch(req);
  return res;
}

/**
 * Batch Api calls to get fonts from AltinnCDN
 * @returns response of all http get requests
 */
export function getFonts() {
  let req, res;
  req = [
    {
      method: 'get',
      url: config.altinnCdn.fonts['altinn-din.css'],
    },
    {
      method: 'get',
      url: config.altinnCdn.fonts['altinn-DIN.woff2'],
    },
    {
      method: 'get',
      url: config.altinnCdn.fonts['altinn-DIN-Bold.woff2'],
    },
  ];
  res = http.batch(req);
  return res;
}

/**
 * Batch Api calls to get images from AltinnCDN
 * @returns response of all http get requests
 */
export function getImg() {
  let req, res;
  req = [
    {
      method: 'get',
      url: config.altinnCdn.images['altinn-logo-black'],
    },
    {
      method: 'get',
      url: config.altinnCdn.images['favicon.ico'],
    },
  ];
  res = http.batch(req);
  return res;
}

/**
 * API call to altinn orgs from AltinnCDN
 * @returns response of the http get request
 */
export function getOrgs() {
  var endpoint = config.altinnCdn.orgs;
  return http.get(endpoint, null);
}
