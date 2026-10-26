import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../auth.js', import.meta.url), 'utf8');
const { default: auth } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);

for (const uri of [
  '/',
  '/ttd/app',
  '/api/v1/user/tokens',
  '/user/settings/keys',
  '/other/app.git/git-upload-pack',
]) {
  test(`Mockporten cannot access Gitea directly: ${uri}`, () => {
    let status;
    auth.handleRequest({
      uri,
      headersIn: {},
      variables: {},
      subrequest(_uri, _options, callback) {
        callback({
          status: 200,
          responseText: JSON.stringify({
            username: 'mockporten-editor',
            authMethod: 'Cookies',
            authenticationProvider: 'mockporten',
          }),
        });
      },
      return(code) {
        status = code;
      },
      internalRedirect() {
        assert.fail('Test identity must not reach Gitea');
      },
      warn() {},
    });
    assert.equal(status, 403);
  });
}

test('ordinary cookie authentication is unchanged', () => {
  let destination;
  const request = {
    uri: '/ttd/app',
    headersIn: {},
    variables: {},
    subrequest(_uri, _options, callback) {
      callback({
        status: 200,
        responseText: JSON.stringify({ username: 'developer', authMethod: 'Cookies' }),
      });
    },
    return() {
      assert.fail('Ordinary user must not be blocked');
    },
    internalRedirect(value) {
      destination = value;
    },
    warn() {},
  };
  auth.handleRequest(request);
  assert.equal(destination, '@proxy_to_gitea');
  assert.equal(request.variables.auth_username, 'developer');
});
