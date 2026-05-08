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

# No Designer session (401): forward to Gitea with X-WEBAUTH-* cleared,
# so alternate Gitea auth (PAT, basic) can still take over.
GET {{proxy_on_pub}}/api/v1/repos
Cookie: scenario=expired
Authorization: token pat-abc
HTTP 200
[Asserts]
jsonpath "$.headers['authorization']"      == "token pat-abc"
jsonpath "$.headers['x-webauth-user']"     not exists
jsonpath "$.headers['x-webauth-fullname']" not exists

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

# Designer 404 surfaces as 502 (any non-2xx-non-{401,403} hits the catch-all branch)
GET {{proxy_on_pub}}/foo
Cookie: scenario=not_found
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

# ApiKey auth allowed on git-receive-pack (push, POSTed by real git client)
POST {{proxy_on_pub}}/owner/repo.git/git-receive-pack
Cookie: scenario=apikey_user
HTTP 200
[Asserts]
jsonpath "$.method"                    == "POST"
jsonpath "$.headers['x-webauth-user']" == "{{APIKEY_USERNAME}}"

# ApiKey auth allowed on /info/refs?service=... (real git smart-HTTP path; regex `?` branch)
GET {{proxy_on_pub}}/owner/repo.git/info/refs?service=git-upload-pack
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

# X-Api-Key (no Cookie) drives the ApiKey scenario via Designer subrequest:
# verifies the proxy actually forwards X-Api-Key to /_internal/userinfo
GET {{proxy_on_pub}}/api/v1/repos
X-Api-Key: apikey_user
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

# Cookie auth bypasses the ApiKey path allowlist (positive control):
# a Cookie-authed user can hit a git endpoint and gets X-WEBAUTH-USER injected
GET {{proxy_on_pub}}/owner/repo.git/info/refs
Cookie: scenario=valid_user
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']" == "{{VALID_USERNAME}}"

# === OIDC disabled ==========================================================

# Client X-WEBAUTH-USER is stripped even with OIDC off
GET {{proxy_off_pub}}/foo
X-WEBAUTH-USER: attacker
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']" not contains "attacker"

# === Internal endpoint boundary (independent of feature flag) ===============

# /_internal/userinfo is nginx-internal-only; external calls must 404
# (regression: removing the `internal;` directive would expose Designer auth proxying)
GET {{proxy_on_pub}}/_internal/userinfo
HTTP 404

# Same boundary holds with OIDC off
GET {{proxy_off_pub}}/_internal/userinfo
HTTP 404
