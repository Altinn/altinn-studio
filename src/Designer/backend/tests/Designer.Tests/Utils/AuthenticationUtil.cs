#nullable disable
using System.Collections.Generic;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Moq;

namespace Designer.Tests.Utils
{
    public static class AuthenticationUtil
    {
        internal static string GetXsrfTokenFromCookie(IEnumerable<string> setCookieHeader)
        {
            foreach (string singleCookieHeader in setCookieHeader)
            {
                string[] cookies = singleCookieHeader.Split(',');

                foreach (string cookie in cookies)
                {
                    string[] cookieSettings = cookie.Split(";");

                    if (cookieSettings[0].StartsWith("XSRF-TOKEN"))
                    {
                        return cookieSettings[0].Replace("XSRF-TOKEN" + "=", string.Empty);
                    }
                }
            }

            return null;
        }

        internal static Mock<IHttpContextAccessor> GetAuthenticatedHttpContextAccessor(string userName = "testUser")
        {
            var httpContextAccessor = new Mock<IHttpContextAccessor>();

            MockUserPrincipal(httpContextAccessor, userName);
            MockHttpContextGetToken(httpContextAccessor, "access_token", "testToken", null, userName);

            return httpContextAccessor;
        }

        private static void MockHttpContextGetToken(
            Mock<IHttpContextAccessor> httpContextAccessorMock,
            string tokenName, string tokenValue, string scheme = null, string username = "testUser")
        {
            var authenticationServiceMock = new Mock<IAuthenticationService>();
            httpContextAccessorMock
                .Setup(x => x.HttpContext.RequestServices.GetService(typeof(IAuthenticationService)))
                .Returns(authenticationServiceMock.Object);

            var authResult = AuthenticateResult.Success(
                new AuthenticationTicket(GetTestClaimsPrincipal(username), scheme));

            authResult.Properties.StoreTokens([
                new AuthenticationToken { Name = tokenName, Value = tokenValue }
            ]);

            authenticationServiceMock
                .Setup(x => x.AuthenticateAsync(httpContextAccessorMock.Object.HttpContext, scheme))
                .ReturnsAsync(authResult);
        }

        private static void MockUserPrincipal(Mock<IHttpContextAccessor> httpContextAccessorMock, string userName = "testUser")
        {
            httpContextAccessorMock.Setup(req => req.HttpContext.User).Returns(() => GetTestClaimsPrincipal(userName));
        }

        private static ClaimsPrincipal GetTestClaimsPrincipal(string userName)
        {
            var claims = new[] { new Claim(ClaimTypes.Name, userName) };
            var identity = new ClaimsIdentity(claims, userName);
            return new ClaimsPrincipal(identity);
        }
    }
}
