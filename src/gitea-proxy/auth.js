var oidcEnabled = process.env.STUDIO_OIDC_ENABLED === 'true';

function handleRequest(r) {
  if (!oidcEnabled) {
    r.internalRedirect('@proxy_to_gitea_clean');
    return;
  }

  r.subrequest('/_internal/userinfo', { method: 'GET' }, function (reply) {
    if (reply.status === 401 || reply.status === 403) {
      r.internalRedirect('@proxy_to_gitea_clean');
      return;
    }

    if (reply.status !== 200) {
      r.return(502, 'Userinfo endpoint unavailable');
      return;
    }

    try {
      var body = JSON.parse(reply.responseText);
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
