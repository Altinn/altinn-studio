using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;

namespace Altinn.Authorization.ABAC.UnitTest.Utils
{
    public static class ClaimsPrincipalUtil
    {


        public static ClaimsPrincipal GetManagingDirectorPrincialForParty(int userId)
        {
            List<Claim> claims = new List<Claim>
            {
                new Claim("urn:altinn:userid", userId.ToString(), ClaimValueTypes.Integer, "Altinn"),
                new Claim("urn:altinn:rolecode", "DAGL", ClaimValueTypes.String, "Altinn"),
                new Claim("urn:altinn:rolecode", "UTINN", ClaimValueTypes.String, "Altinn")
            };

            ClaimsIdentity identity = new ClaimsIdentity();
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);

            return principal;
        }

        public static ClaimsPrincipal GetUserWithRoles(int userId, List<string> roleList)
        {

            List<Claim> claims = new List<Claim>
            {
                new Claim("urn:altinn:userid", userId.ToString(), ClaimValueTypes.Integer, "Altinn"),
            };

            foreach(string role in roleList)
            {
                claims.Add(new Claim("urn:altinn:rolecode", role, ClaimValueTypes.String, "Altinn"));
            }

            ClaimsIdentity identity = new ClaimsIdentity();
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);

            return principal;
        }

        public static ClaimsPrincipal GetUserWithClaims(int userId, List<Claim> givenClaims)
        {

            List<Claim> claims = new List<Claim>
            {
                new Claim("urn:altinn:userid", userId.ToString(), ClaimValueTypes.Integer, "Altinn"),
            };

            claims.AddRange(givenClaims);

            ClaimsIdentity identity = new ClaimsIdentity();
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);

            return principal;
        }
    }
}
