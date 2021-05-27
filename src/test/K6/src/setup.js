import http from 'k6/http';
import { check } from 'k6';
import * as config from './config.js';
import * as headers from './buildrequestheaders.js';
import { getParties } from './api/platform/authorization.js';
import { addErrorCount, stopIterationOnFail } from './errorcounter.js';
import * as support from './support.js';
import { convertMaskinPortenToken } from './api/platform/authentication.js';
import { getEnterpriseToken } from './api/altinn-testtools/token-generator.js';

const environment = __ENV.env.toLowerCase();
const tokenGeneratorUserName = __ENV.tokengenuser;
const tokenGeneratorUserPwd = __ENV.tokengenuserpwd;
const scopes = __ENV.scopes;
const maskinPortenToken = __ENV.maskinporten;

//Request to Authenticate an user with Altinn userName and password and returns ASPXAUTH Cookie
export function authenticateUser(userName, userPassword) {
  var endpoint = environment != 'yt01' ? config.authentication['authenticationWithPassword'] : config.authentication['authenticationYt01'];
  var requestBody = {
    UserName: userName,
    UserPassword: userPassword,
  };
  var params = {
    headers: {
      Accept: 'application/hal+json',
    },
  };
  var res = http.post(endpoint, requestBody, params);
  var success = check(res, {
    'Authentication towards Altinn 2 Success': (r) => r.status === 200,
  });
  addErrorCount(success);
  stopIterationOnFail('Authentication towards Altinn 2 Failed', success, res);

  const cookieName = '.ASPXAUTH';
  var cookieValue = res.cookies[cookieName][0].value;
  return cookieValue;
}

//Request to Authenticate an user and returns AltinnStudioRuntime Token
export function getAltinnStudioRuntimeToken(aspxauthCookie) {
  var endpoint = config.platformAuthentication['authentication'] + '?goto=' + config.platformAuthentication['refresh'];
  var params = headers.buildHeaderWithAspxAuth(aspxauthCookie, 'platform');
  var res = http.get(endpoint, params);
  var success = check(res, {
    'T3.0 Authentication Success': (r) => r.status === 200,
  });
  addErrorCount(success);
  stopIterationOnFail('T3.0 Authentication Failed', success, res);
  return res.body;
}

//Request to get user data and returns partyId, ssn, userId, orgNr
export function getUserData(altinnStudioRuntimeCookie, appOwner, appName) {
  var endpoint = config.appApiBaseUrl(appOwner, appName) + config.appProfile['user'];
  var params = headers.buildHearderWithRuntime(altinnStudioRuntimeCookie, 'app');
  var res = http.get(endpoint, params);
  var success = check(res, {
    'Get User data': (r) => r.status === 200,
  });
  addErrorCount(success);
  stopIterationOnFail('Get User data failed', success, res);
  res = JSON.parse(res.body);

  var userData = {
    userId: res.userId,
    ssn: res.party.ssn,
    partyId: res.partyId,
  };

  //get parties and find an Org that an user can represent
  res = getParties(userData['userId']);
  success = check(res, {
    'Get User data': (r) => r.status === 200,
  });
  addErrorCount(success);
  stopIterationOnFail('Get User data failed', success, res);

  res = JSON.parse(res.body);
  for (var i = 0; i < res.length; i++) {
    if (res[i].orgNumber != null) {
      userData.orgNumber = res[i].orgNumber;
      break;
    }
  }
  return userData;
}

//Function to clear the cookies under baseurl by setting the expires field to a past date
export function clearCookies() {
  var jar = http.cookieJar();
  jar.set('https://' + config.baseUrl, 'AltinnStudioRuntime', 'test', { expires: 'Mon, 02 Jan 2010 15:04:05 MST' });
  jar.set('https://' + config.baseUrl, '.ASPXAUTH', 'test', { expires: 'Mon, 02 Jan 2010 15:04:05 MST' });
}

//Generate array with type of attachment for all the iterations
//based on the distribution across small, medium and large attachment
export function buildAttachmentTypeArray(distribution, totalIterations) {
  distribution = distribution.split(';');
  var small = distribution[0] != null ? buildArray(totalIterations * (distribution[0] / 100), 's') : [];
  var medium = distribution[1] != null ? buildArray(totalIterations * (distribution[1] / 100), 'm') : [];
  var large = distribution[2] != null ? buildArray(totalIterations * (distribution[2] / 100), 'l') : [];
  var attachmentTypes = small.concat(medium, large);
  return support.shuffle(attachmentTypes);
}

//Function to build an array with the specified value and count
function buildArray(count, value) {
  var array = [];
  for (var i = 0; i < count; i++) {
    array.push(value);
  }
  return array;
}
/**
 * generate an altinn token for TTD based on the environment
 * use exchange token if prod, and altinnTestTools for test environments
 * @returns altinn token with the scopes for an org/appowner
 */
export function getAltinnTokenForTTD() {
  if (environment === 'prod') {
    return convertMaskinPortenToken(maskinPortenToken, 'true');
  } else {
    var queryParams = {
      env: environment,
      scopes: scopes,
      org: 'ttd',
      orgNo: '991825827',
    };
    return getEnterpriseToken(tokenGeneratorUserName, tokenGeneratorUserPwd, queryParams);
  }
}
