using System;
using System.Collections.Generic;
using System.Security.Claims;
using AltinnCore.Authentication.Constants;

#pragma warning disable 1591
#pragma warning disable SA1600

namespace Designer.Tests.Utils
{
    public static class PrincipalUtil
    {
        public static readonly string AltinnCoreClaimTypesOrg = "urn:altinn:org";
        public static readonly string AltinnCoreClaimTypesOrgNumber = "urn:altinn:orgNumber";

        public static ClaimsPrincipal GetToken(string userName)
        {
            List<Claim> claims = new List<Claim>();
            const string Issuer = "https://altinn.no";

            claims.Add(new Claim(AltinnCoreClaimTypes.Developer, userName, ClaimValueTypes.String, Issuer));
            ClaimsIdentity identity = new ClaimsIdentity("TestUserLogin");
            identity.AddClaims(claims);

            return new ClaimsPrincipal(identity);
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
    }
}
