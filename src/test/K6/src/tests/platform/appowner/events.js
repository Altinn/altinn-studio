/* Pre-reqisite for test:
    1. MaskinPorteTokenGenerator https://github.com/Altinn/MaskinportenTokenGenerator built
    2. Installed appOwner certificate
    3. Send maskinporten token as environment variable: -e maskinporten=token

    Environment variables for test environments:
    -e tokengenuser=*** -e tokengenuserpwd=*** -e scopes=altinn:serviceowner/instances.read

    Test script to platform events api with app owner token
    Command: docker-compose run k6 run /src/tests/platform/appowner/events.js
    -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=*** -e maskinpoten=***  -e appsaccesskey=***
*/
import { check } from 'k6';
import { addErrorCount } from '../../../errorcounter.js';
import * as events from '../../../api/platform/events/events.js';
import * as appInstances from '../../../api/app/instances.js';
import * as setUpData from '../../../setup.js';
import { generateJUnitXML, reportPath } from '../../../report.js';

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const appName = __ENV.level2app;

export const options = {
  thresholds: {
    errors: ['count<1'],
  },
  setupTimeout: '1m',
};

//Function to setup data and return userData
export function setup() {
 /* var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
  var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
  var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, appName);*/
  var data = {
    'partyId':20000000
  }
  setUpData.clearCookies();

  //Get org token
  var altinnStudioRuntimeCookie = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ5MDEyMTNEMTEzOUNGNTk5NUFGRjg2NDI2MUNBMDkxNjkwQzlBM0MiLCJ0eXAiOiJKV1QiLCJ4NWMiOiI0OTAxMjEzRDExMzlDRjU5OTVBRkY4NjQyNjFDQTA5MTY5MEM5QTNDIn0.eyJzY29wZSI6ImFsdGlubjpzZXJ2aWNlb3duZXIvaW5zdGFuY2VzLnJlYWQgYWx0aW5uOnNlcnZpY2Vvd25lci9pbnN0YW5jZXMud3JpdGUgYWx0aW5uOmVuZHVzZXIiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwIjoxNjY0NTI5MTY2LCJpYXQiOjE2NjQ1MjczNjYsImNsaWVudF9pZCI6ImVmNDI1MGM3LTQ2ZjgtNDcxZC04MDUxLWQ4NDc2ODYxZTYzMSIsImp0aSI6Ilk3Z3pEakFhaEZOajkyTVRncjZkMVc2MUZTNmVpSkIyVW9zdEZXMkNjLWwiLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifSwidXJuOmFsdGlubjpvcmciOiJ0dGQiLCJ1cm46YWx0aW5uOm9yZ051bWJlciI6Ijk5MTgyNTgyNyIsInVybjphbHRpbm46YXV0aGVudGljYXRlbWV0aG9kIjoibWFza2lucG9ydGVuIiwidXJuOmFsdGlubjphdXRobGV2ZWwiOjMsImlzcyI6Imh0dHBzOi8vcGxhdGZvcm0uYXQyMi5hbHRpbm4uY2xvdWQvYXV0aGVudGljYXRpb24vYXBpL3YxL29wZW5pZC8iLCJhY3R1YWxfaXNzIjoiYWx0aW5uLXRlc3QtdG9vbHMiLCJuYmYiOjE2NjQ1MjczNjZ9.OT45kpoTd-BjovSWCk7ycw9tce7P5t8il7SICQ_H2Ul34D8b4Aydmbj0WQOBzM8AxZWMi5UGSlp8-zcclQSwdTDDZ9K2GJqe1JK6LcFKDE29bHO1TmF8bRNugkK9j4EpoU_IZ9yYeo4o0PN7Qvti_sprIHepp9tcY3ptMDHpdrUhqjRoJ0k0PKb9Qyqq5PtNrkCpnsnq94gpxz3k_Zs7N9tJoNuP5Xp3qoYES4j3lBXnyJB4X3_HpuLhKxh7nu5_0B78NGU8p7jXkW9-nxlGC0OKGC8-jLMDBWd2lcIfIChI45Mpo87fz-TeQy6O6mAE1QUIR69uRMGN0cXns8aeRw"; //setUpData.getAltinnTokenForTTD();
  data.RuntimeToken = altinnStudioRuntimeCookie;
  var instance = appInstances.postInstance(altinnStudioRuntimeCookie, data['partyId'], appOwner, appName);
  data.instanceId = JSON.parse(instance.body).id;
  return data;
}

//Test for platform events as app owner and validate response
export default function (data) {
  const partyId = data['partyId'];
  const runtimeToken = data['RuntimeToken'];
  var res, success, eventsFilter;

  //Find today's date to be passed a filter to get events
  var from = new Date();
  from.setHours(0, 0, 0);
  from = from.toISOString();

  //Test to post events and assert that response is 403
  res = events.postEvents(runtimeToken);
  success = check(res, {
    'POST Events status is 403': (r) => r.status === 403,
  });
  addErrorCount(success);

  //Test to get events from today based on party id, app and org
  eventsFilter = {
    party: partyId,
    from: from,
  };
  res = events.getEventsByparty(runtimeToken, eventsFilter);
  success = check(res, {
    'GET Todays Events based on party status is 200': (r) => r.status === 200,
    'GET Todays Events based on party count greater than 0': (r) => JSON.parse(r.body).length > 0,
    'GET Todays Events lists only events for party': (r) => {
      var events = r.json();
      return events.every((event) => event.subject.includes(partyId));
    },
  });
  addErrorCount(success);

  //Test to get events api by org and app name and check response
  eventsFilter = {
    from: from,
  };
  res = events.getEvents(runtimeToken, appOwner, appName, eventsFilter);
  success = check(res, {
    'GET Todays Events by org app name status is 200': (r) => r.status === 200,
    'GET Todays Events lists only events for app': (r) => {
      var events = r.json();
      return events.every((event) => event.source.includes(appName));
    },
  });
  addErrorCount(success);
}

export function handleSummary(data) {
  let result = {};
  result[reportPath('platformAppownerEvents.xml')] = generateJUnitXML(data, 'platform-appowner-events');
  return result;
}
