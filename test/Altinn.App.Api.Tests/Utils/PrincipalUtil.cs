using System.Security.Claims;
using Altinn.App.Api.Tests.Mocks;
using AltinnCore.Authentication.Constants;

namespace Altinn.App.Api.Tests.Utils
{
    public static class PrincipalUtil
    {
        public static string GetToken(int? userId, int? partyId, int authenticationLevel = 2)
        {
            ClaimsPrincipal principal = GetUserPrincipal(userId, partyId, authenticationLevel);
            string token = JwtTokenMock.GenerateToken(principal, new TimeSpan(1, 1, 1));
            return token;
        }

        public static ClaimsPrincipal GetUserPrincipal(int? userId, int? partyId, int authenticationLevel = 2)
        {
            List<Claim> claims = new List<Claim>();
            string issuer = "www.altinn.no";

            claims.Add(
                new Claim(ClaimTypes.NameIdentifier, $"user-{userId}-{partyId}", ClaimValueTypes.String, issuer)
            );
            if (userId > 0)
            {
                claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userId.ToString()!, ClaimValueTypes.String, issuer));
            }

            if (partyId > 0)
            {
                claims.Add(
                    new Claim(AltinnCoreClaimTypes.PartyID, userId.ToString()!, ClaimValueTypes.Integer32, issuer)
                );
            }

            claims.Add(new Claim(AltinnCoreClaimTypes.UserName, $"User{userId}", ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, "Mock", ClaimValueTypes.String, issuer));
            claims.Add(
                new Claim(
                    AltinnCoreClaimTypes.AuthenticationLevel,
                    authenticationLevel.ToString(),
                    ClaimValueTypes.Integer32,
                    issuer
                )
            );

            ClaimsIdentity identity = new ClaimsIdentity("mock");
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            return principal;
        }

        public static ClaimsPrincipal GetOrgPrincipal(string org, int authenticationLevel = 3)
        {
            List<Claim> claims = new List<Claim>();
            string issuer = "www.altinn.no";
            claims.Add(new Claim(AltinnCoreClaimTypes.Org, org, ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, "Mock", ClaimValueTypes.String, issuer));
            claims.Add(
                new Claim(
                    AltinnCoreClaimTypes.AuthenticationLevel,
                    authenticationLevel.ToString(),
                    ClaimValueTypes.Integer32,
                    issuer
                )
            );

            ClaimsIdentity identity = new ClaimsIdentity("mock");
            identity.AddClaims(claims);

            return new ClaimsPrincipal(identity);
        }

        public static string GetOrgToken(string org, int authenticationLevel = 3)
        {
            ClaimsPrincipal principal = GetOrgPrincipal(org, authenticationLevel);
            return JwtTokenMock.GenerateToken(principal, new TimeSpan(1, 1, 1));
        }

        public static string GetSelfIdentifiedUserToken(string username, string partyId, string userId)
        {
            List<Claim> claims = new List<Claim>();
            string issuer = "www.altinn.no";
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId.ToString(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userId.ToString(), ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.UserName, username, ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.PartyID, partyId.ToString(), ClaimValueTypes.Integer32, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, "Mock", ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "0", ClaimValueTypes.Integer32, issuer));

            ClaimsIdentity identity = new ClaimsIdentity("mock");
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            string token = JwtTokenMock.GenerateToken(principal, new TimeSpan(1, 1, 1));

            return token;
        }

        public static string GetOrgToken(string org, string orgNo, int authenticationLevel = 4)
        {
            List<Claim> claims = new List<Claim>();
            string issuer = "www.altinn.no";
            claims.Add(new Claim(AltinnCoreClaimTypes.Org, org, ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.OrgNumber, orgNo, ClaimValueTypes.String, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticateMethod, "Mock", ClaimValueTypes.String, issuer));
            claims.Add(
                new Claim(
                    AltinnCoreClaimTypes.AuthenticationLevel,
                    authenticationLevel.ToString(),
                    ClaimValueTypes.Integer32,
                    issuer
                )
            );

            ClaimsIdentity identity = new ClaimsIdentity("mock");
            identity.AddClaims(claims);
            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            string token = JwtTokenMock.GenerateToken(principal, new TimeSpan(1, 1, 1));

            return token;
        }
    }
}
