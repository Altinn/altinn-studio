var oidcEnabled = process.env.STUDIO_OIDC_ENABLED === 'true';

// Restricts API key auth to git operations and Gitea REST API only (blocks web UI).
// Part 1: ^/<owner>/<repo>[.git]/<git-endpoint>[?|end] — matches git clone/push/pull
// Part 2: ^/api/v1/ — matches Gitea REST API calls
// Cookie-authenticated users are not affected by this restriction.
var apiKeyAllowedPattern =
  /^\/[^/]+\/[^/]+(\.git)?\/(info\/refs|git-upload-pack|git-receive-pack)(\?|$)|^\/api\/v1\//;

function getApiKey(r) {
  var headerApiKey = r.headersIn['X-Api-Key'];
  if (headerApiKey) {
    return { value: headerApiKey, source: 'header' };
  }

  var authorization = r.headersIn.Authorization || r.headersIn.authorization;
  if (!authorization || authorization.slice(0, 6).toLowerCase() !== 'basic ') {
    return { value: '', source: '' };
  }

  try {
    var decoded = Buffer.from(authorization.slice(6), 'base64').toString();
    var separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) {
      return { value: '', source: '' };
    }
    return { value: decoded.slice(separatorIndex + 1), source: 'basic' };
  } catch (e) {
    r.warn('Failed to decode Basic auth: ' + e.message);
    return { value: '', source: '' };
  }
}

function handleRequest(r) {
  if (!oidcEnabled) {
    r.internalRedirect('@proxy_to_gitea_clean');
    return;
  }

  var apiKey = getApiKey(r);
  r.variables.auth_api_key = apiKey.value;
  r.subrequest('/_internal/userinfo', { method: 'GET' }, function (reply) {
    if (reply.status === 401 || reply.status === 403) {
      if (apiKey.source === 'header') {
        r.return(401, 'Invalid API key');
        return;
      }

      r.internalRedirect('@proxy_to_gitea_clean');
      return;
    }

    if (reply.status !== 200) {
      r.return(502, 'Userinfo endpoint unavailable');
      return;
    }

    try {
      var body = JSON.parse(reply.responseText);

      if (body.authMethod === 'ApiKey' && !apiKeyAllowedPattern.test(r.uri)) {
        r.return(
          403,
          'API key authentication is only allowed for git operations and API endpoints',
        );
        return;
      }

      r.variables.auth_username = body.username;
      r.variables.auth_fullname = (body.givenName || '') + ' ' + (body.familyName || '');
      r.internalRedirect('@proxy_to_gitea');
    } catch (e) {
      r.warn('Parse error: ' + e.message + ', body was: ' + reply.responseText);
      r.return(502, 'Failed to parse userinfo response');
    }
  });
}

function handleInternalRequest(r) {
  if (!oidcEnabled) {
    r.internalRedirect('@proxy_to_gitea_internal_clean');
    return;
  }

  var username = r.headersIn['X-WEBAUTH-USER'];
  if (username) {
    r.variables.auth_username = username;
    r.variables.auth_fullname = r.headersIn['X-WEBAUTH-FULLNAME'] || '';
    r.internalRedirect('@proxy_to_gitea_internal');
  } else {
    r.internalRedirect('@proxy_to_gitea_passthrough');
  }
}

export default { handleRequest, handleInternalRequest };
