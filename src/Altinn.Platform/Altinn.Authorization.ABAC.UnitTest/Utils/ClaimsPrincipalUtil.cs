using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;

namespace Altinn.Authorization.ABAC.UnitTest.Utils
{
    public static class ClaimsPrincipalUtil
    {


        public static ClaimsPrincipal GetManagingDirectorPrincialForParty()
        {
            List<Claim> claims = new List<Claim>
            {
                new Claim("urn:altinn:rolecode", "DAGL", ClaimValueTypes.String, "Altinn")
            };

            ClaimsIdentity identity = new ClaimsIdentity();
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);

            return principal;
        }
    }
}
