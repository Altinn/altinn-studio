const appsAccessSubscriptionKey = __ENV.appsaccesskey;
const sblAccessSubscriptionKey = __ENV.sblaccesskey;

//Function to determine the headers for a POST/PUT data based on dataType
export function buildHeadersForData(isBinaryAttachment, binaryAttachmentType, altinnStudioRuntimeCookie, api) {
  var params = {};
  if (isBinaryAttachment) {
    params = {
      headers: {
        Authorization: 'Bearer ' + altinnStudioRuntimeCookie,
        'Content-Type': `${findContentType(binaryAttachmentType)}`,
        'Content-Disposition': `attachment; filename=test.${binaryAttachmentType}`,
      },
    };
  } else {
    params = {
      headers: {
        Authorization: 'Bearer ' + altinnStudioRuntimeCookie,
        'Content-Type': 'application/xml',
      },
    };
  }
  params = addSubscriptionKey(params, appsAccessSubscriptionKey, api);
  return params;
}

//Function to build headers with altinnStudioRuntimeCookie and returns a json object
export function buildHearderWithRuntime(altinnStudioRuntimeCookie, api) {
  var params = {
    headers: { Authorization: 'Bearer ' + altinnStudioRuntimeCookie },
  };
  params = addSubscriptionKey(params, appsAccessSubscriptionKey, api);
  return params;
}

//Function to build headers with altinnStudioRuntimeCookie for storage/sbl api endpoints and returns a json object
export function buildHearderWithRuntimeforSbl(altinnStudioRuntimeCookie, api) {
  var params = {
    headers: { Authorization: 'Bearer ' + altinnStudioRuntimeCookie },
  };
  params = addSubscriptionKey(params, sblAccessSubscriptionKey, api);
  return params;
}

//Function to build headers with altinnStudioRuntimeCookie and JSON content-type and returns a json object
export function buildHearderWithRuntimeandJson(altinnStudioRuntimeCookie, api) {
  var params = {
    headers: {
      Authorization: 'Bearer ' + altinnStudioRuntimeCookie,
      'Content-Type': 'application/json',
    },
  };
  params = addSubscriptionKey(params, appsAccessSubscriptionKey, api);
  return params;
}

//Function to build headers with .aspxauth cookie
export function buildHeaderWithAspxAuth(aspxauthCookie, api) {
  var params = {
    cookies: { '.ASPXAUTH': aspxauthCookie },
  };
  params = addSubscriptionKey(params, appsAccessSubscriptionKey, api);
  return params;
}

//Function to build headers with .aspxauth cookie
export function buildHeaderWithJson(api) {
  var params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  params = addSubscriptionKey(params, appsAccessSubscriptionKey, api);
  return params;
}

//Function to build headers with altinnstudioruntime as cookie and returns the response
export function buildHeaderWithRuntimeAsCookie(altinnStudioRuntimeCookie, api) {
  var params = {
    cookies: {
      AltinnStudioRuntime: altinnStudioRuntimeCookie,
    },
  };
  params = addSubscriptionKey(params, appsAccessSubscriptionKey, api);
  return params;
}

//Function to build a request header only with subscription key
export function buildHeaderWithSubsKey(api) {
  var params = {};
  params = addSubscriptionKey(params, appsAccessSubscriptionKey, api);
  return params;
}

/**
 *
 * @param {*} altinnStudioRuntimeCookie Token to send in header as bearer token
 * @param {String} api platform or app
 * @returns {JSON} a JSON object with the header values for Authorization and content-type: multipart/formdata
 */
export function buildHearderWithRuntimeForMultipart(altinnStudioRuntimeCookie, api) {
  var params = {
    headers: {
      Authorization: 'Bearer ' + altinnStudioRuntimeCookie,
      'Content-Type': 'multipart/form-data; boundary="abcdefg"',
    },
  };
  params = addSubscriptionKey(params, appsAccessSubscriptionKey, api);
  return params;
}

//Function to add subscription key to the header when sent as env variable from command line
//and endpoint is a platform endpoint
export function addSubscriptionKey(params, subscriptionKey, api) {
  if (subscriptionKey != null && api == 'platform') {
    if (params['headers'] == null) {
      params['headers'] = {};
    }
    params.headers['Ocp-Apim-Subscription-Key'] = subscriptionKey;
  }
  return params;
}

/**
 * Find the content type for a given type
 * @param {string} type xml, pdf, txt
 * @returns content type
 */
function findContentType(type) {
  var contentType;
  switch (type) {
    case 'xml':
      contentType = 'text/xml';
      break;
    case 'pdf':
      contentType = 'application/pdf';
      break;
    case 'txt':
      contentType = 'text/plain';
      break;
    default:
      contentType = 'application/octet-stream';
      break;
  }
  return contentType;
}
