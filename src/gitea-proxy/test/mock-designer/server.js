const http = require('http');

// Mirrors Designer's GET /designer/api/v1/studio-oidc/userinfo:
//   record UserInfoResponse(string? Username, string? GivenName, string? FamilyName, string? AuthMethod)
// AuthMethod values are the AuthenticationScheme names: "Cookies" or "ApiKey".

const USERINFO_PATH = '/designer/api/v1/studio-oidc/userinfo';

const scenarios = {
  valid_user: {
    status: 200,
    body: {
      username: process.env.VALID_USERNAME,
      givenName: process.env.VALID_GIVEN_NAME,
      familyName: process.env.VALID_FAMILY_NAME,
      authMethod: 'Cookies',
    },
  },
  apikey_user: {
    status: 200,
    body: {
      username: process.env.APIKEY_USERNAME,
      givenName: process.env.APIKEY_GIVEN_NAME,
      familyName: process.env.APIKEY_FAMILY_NAME,
      authMethod: 'ApiKey',
    },
  },
  expired: { status: 401, body: '' },
  forbidden: { status: 403, body: '' },
  not_found: { status: 404, body: '' },
  server_error: { status: 500, body: '' },
  malformed: { status: 200, body: 'not-json', raw: true },
};

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k) out[k] = rest.join('=');
  }
  return out;
}

const server = http.createServer((req, res) => {
  if (req.url !== USERINFO_PATH) {
    res.writeHead(404);
    res.end();
    return;
  }
  // Scenario routing prefers Cookie (browser flow), falls back to X-Api-Key
  // (which is what real ApiKey-authed callers send, and the proxy forwards it
  // to /_internal/userinfo via `proxy_set_header X-Api-Key`).
  const name = parseCookies(req.headers.cookie).scenario || req.headers['x-api-key'] || 'expired';
  const scenario = scenarios[name] || scenarios.expired;
  res.writeHead(scenario.status, { 'Content-Type': 'application/json' });
  if (scenario.status !== 200) {
    res.end(scenario.body || '');
    return;
  }
  res.end(scenario.raw ? scenario.body : JSON.stringify(scenario.body));
});

server.listen(3000, () => {
  console.log('mock designer listening on :3000');
});
