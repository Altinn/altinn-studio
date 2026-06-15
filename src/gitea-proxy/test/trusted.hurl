# Cases for the trusted listener (port 81).
# Trust model: caller is assumed authenticated upstream (Designer); reachable
# in production only from the designer pod via NetworkPolicy. The proxy honors
# X-WEBAUTH-USER directly here and does not call the Designer subrequest.

# === OIDC enabled ===========================================================

# Trusts caller-supplied X-WEBAUTH-USER
GET {{proxy_on_int}}/foo
X-WEBAUTH-USER: designer-user
X-WEBAUTH-FULLNAME: Designer User
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']"     == "designer-user"
jsonpath "$.headers['x-webauth-fullname']" == "Designer User"

# Passthrough preserves other auth, omits X-WEBAUTH-USER
GET {{proxy_on_int}}/api/v1/repos
Authorization: token abc
HTTP 200
[Asserts]
jsonpath "$.headers['authorization']"  == "token abc"
jsonpath "$.headers['x-webauth-user']" not exists

# === OIDC disabled ==========================================================

# Client X-WEBAUTH-USER is stripped even with OIDC off
GET {{proxy_off_int}}/foo
X-WEBAUTH-USER: attacker
HTTP 200
[Asserts]
jsonpath "$.headers['x-webauth-user']" not contains "attacker"
