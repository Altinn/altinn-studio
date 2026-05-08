# Cases for the public listener (port 80).
# Trust model: untrusted callers; auth is enforced via the Designer subrequest.
# Mock backend (mendhak/http-https-echo) echoes the request as JSON,
# so we assert on the headers Gitea would have seen.

# === OIDC enabled ===========================================================

# Designer-resolved username is injected as X-WEBAUTH-USER
GET {{proxy_on_pub}}/foo
Cookie: scenario=valid_user
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']"     == "{{VALID_USERNAME}}"
jsonpath "$.headers['x-webauth-fullname']" == "{{VALID_GIVEN_NAME}} {{VALID_FAMILY_NAME}}"

# Client-supplied X-WEBAUTH-USER cannot override Designer's resolved value
GET {{proxy_on_pub}}/foo
Cookie: scenario=valid_user
X-WEBAUTH-USER: attacker
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']" == "{{VALID_USERNAME}}"

# Designer 401: forward to Gitea without leaking client X-WEBAUTH-USER
GET {{proxy_on_pub}}/foo
Cookie: scenario=expired
X-WEBAUTH-USER: attacker
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']" not contains "attacker"

# Designer 403: forward to Gitea without leaking client X-WEBAUTH-USER
GET {{proxy_on_pub}}/foo
Cookie: scenario=forbidden
X-WEBAUTH-USER: attacker
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']" not contains "attacker"

# Designer 500 surfaces as 502
GET {{proxy_on_pub}}/foo
Cookie: scenario=server_error
HTTP 502

# Designer malformed JSON surfaces as 502
GET {{proxy_on_pub}}/foo
Cookie: scenario=malformed
HTTP 502

# ApiKey auth is rejected on web UI paths
GET {{proxy_on_pub}}/owner/repo/issues
Cookie: scenario=apikey_user
HTTP 403

# ApiKey auth allowed on /:owner/:repo.git/info/refs
GET {{proxy_on_pub}}/owner/repo.git/info/refs
Cookie: scenario=apikey_user
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']" == "{{APIKEY_USERNAME}}"

# ApiKey auth allowed on /:owner/:repo/info/refs (no .git)
GET {{proxy_on_pub}}/owner/repo/info/refs
Cookie: scenario=apikey_user
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']" == "{{APIKEY_USERNAME}}"

# ApiKey auth allowed on git-upload-pack
GET {{proxy_on_pub}}/owner/repo.git/git-upload-pack
Cookie: scenario=apikey_user
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']" == "{{APIKEY_USERNAME}}"

# ApiKey auth allowed on /api/v1/
GET {{proxy_on_pub}}/api/v1/repos
Cookie: scenario=apikey_user
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']" == "{{APIKEY_USERNAME}}"

# ApiKey rejected on /api/v2/ (allowlist is exact)
GET {{proxy_on_pub}}/api/v2/anything
Cookie: scenario=apikey_user
HTTP 403

# ApiKey rejected on arbitrary non-git, non-API URLs (default-deny)
GET {{proxy_on_pub}}/some/random/path
Cookie: scenario=apikey_user
HTTP 403

# ApiKey rejected on look-alike git path (regex must anchor at endpoint terminator)
GET {{proxy_on_pub}}/owner/repo.git/git-upload-pack-evil
Cookie: scenario=apikey_user
HTTP 403

# ApiKey rejected on git endpoint with extra trailing path
GET {{proxy_on_pub}}/owner/repo/info/refs/extra
Cookie: scenario=apikey_user
HTTP 403

# Missing given/family name yields fullname " "  (auth.js: '' + ' ' + '')
GET {{proxy_on_pub}}/foo
Cookie: scenario=no_names
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']"     == "{{NO_NAMES_USERNAME}}"
jsonpath "$.headers['x-webauth-fullname']" == " "

# === OIDC disabled ==========================================================

# Client X-WEBAUTH-USER is stripped even with OIDC off
GET {{proxy_off_pub}}/foo
X-WEBAUTH-USER: attacker
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']" not contains "attacker"
