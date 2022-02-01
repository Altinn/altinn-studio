using System;
using System.Collections.Generic;
using System.Security.Claims;
using Altinn.Common.AccessToken.Constants;
using Altinn.Platform.Register.Tests.Mocks;
using AltinnCore.Authentication.Constants;

namespace Altinn.Platform.Register.Tests.Utils
{
    public static class PrincipalUtil
    {
        public static readonly string AltinnCoreClaimTypesOrg = "urn:altinn:org";
        public static readonly string AltinnCoreClaimTypesOrgNumber = "urn:altinn:orgNumber";

        public static string GetToken(int userId, int authenticationLevel = 2)
        {
            List<Claim> claims = new List<Claim>();
            string issuer = "www.altinn.no";
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userId.ToString(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.UserName, "UserOne", ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, userId.ToString(), ClaimValueTypes.Integer32, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, "Mock", ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, authenticationLevel.ToString(), ClaimValueTypes.Integer32, issuer));

            ClaimsIdentity identity = new ClaimsIdentity("mock");
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            string token = JwtTokenMock.GenerateToken(principal, new TimeSpan(0, 1, 5));

            return token;
        }

        public static string GetAccessToken(string issuer, string app)
        {
            List<Claim> claims = new List<Claim>
            {
                new Claim(AccessTokenClaimTypes.App, app, ClaimValueTypes.String, issuer)
            };

            ClaimsIdentity identity = new ClaimsIdentity("mock");
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            string token = JwtTokenMock.GenerateToken(principal, new TimeSpan(0, 1, 5), issuer);

            return token;
        }

        public static string GetExpiredToken()
        {
            return "eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ4Q0VFNjAzMzEwMkYzMjQzMTk2NDc4QUYwNkZCNDNBMTc2NEQ4NDMiLCJ4NXQiOiJTTTdtQXpFQzh5UXhsa2"
                   + "VLOEctME9oZGsyRU0iLCJ0eXAiOiJKV1QifQ.eyJ1cm46YWx0aW5uOnVzZXJpZCI6IjEiLCJ1cm46YWx0aW5uOnVzZXJuYW1lIjoiVXNlck9uZSI"
                   + "sInVybjphbHRpbm46cGFydHlpZCI6MSwidXJuOmFsdGlubjphdXRoZW50aWNhdGVtZXRob2QiOiJNb2NrIiwidXJuOmFsdGlubjphdXRobGV2ZWw"
                   + "iOjIsIm5iZiI6MTU4ODc2NjU4NSwiZXhwIjoxNTg4NzY2NTg5LCJpYXQiOjE1ODg3NjY1ODUsImF1ZCI6ImFsdGlubi5ubyJ9.JbwlNTwnCpafFZ"
                   + "-452MM9ZvxTdkb2pMbPFsIOEqB0rvj62Xtex44fHW1Sf2mIld7UmEgw8Lfg-8qKz1SBXx-CYk_ZF-1g7suldEHqhjovQ8IQUwFMy8JaPbVJrZigI"
                   + "2UI2myHAETj67YnKkAdImvEUPrJXYtRAOYzp4jH_GrFkGXe30sx3RIvCt2k5BFdsV2Q6kLXsH4Q0jpfJR0XkG1mhgojPc8es1no8XWB8yn8HZGgi"
                   + "I9d4F2Edrs0nhCKs5JSFbdX5jVNAhYOw833yNxzSI5keFlRrCN_BXDSqdo9bn8joCwnCJ9fZ3kv_ieYKbMa0tgcN9lBM_KcGQU5EPxpA";
        }

        public static string GetOrgToken(string org, int orgNumber = 111111111, string scope = "altinn:appdeploy")
        {
            List<Claim> claims = new List<Claim>();
            string issuer = "www.altinn.no";
            claims.Add(new Claim(AltinnCoreClaimTypesOrg, org, ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypesOrgNumber, orgNumber.ToString(), ClaimValueTypes.Integer32, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, "Mock", ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "3", ClaimValueTypes.Integer32, issuer));
            claims.Add(new Claim("urn:altinn:scope", scope, ClaimValueTypes.String, "maskinporten"));

            ClaimsIdentity identity = new ClaimsIdentity("mock-org");
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            string token = JwtTokenMock.GenerateToken(principal, new TimeSpan(1, 1, 1));

            return token;
        }
    }
}
