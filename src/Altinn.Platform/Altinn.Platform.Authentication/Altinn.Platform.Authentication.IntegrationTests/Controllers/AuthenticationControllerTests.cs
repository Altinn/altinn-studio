using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Controllers;
using Altinn.Platform.Authentication.Enum;
using Altinn.Platform.Authentication.IntegrationTests.Fakes;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services;
using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

using Moq;
using Newtonsoft.Json;

using Xunit;

namespace Altinn.Platform.Authentication.IntegrationTests.Controllers
{
    /// <summary>
    /// Represents a collection of unit test with all integration tests of the <see cref="AuthenticationController"/> class.
    /// </summary>
    public class AuthenticationControllerTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private const string OrganisationIdentity = "OrganisationLogin";

        private readonly WebApplicationFactory<Startup> _factory;

        /// <summary>
        /// Initialises a new instance of the <see cref="AuthenticationControllerTests"/> class with the given WebApplicationFactory.
        /// </summary>
        /// <param name="factory">The WebApplicationFactory to use when creating a test server.</param>
        public AuthenticationControllerTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Test of method <see cref="AuthenticationController.AuthenticateOrganisation"/>.
        /// </summary>
        [Fact]
        public async Task AuthenticateOrganisation_RequestTokenWithValidExternalToken_ReturnsNewToken()
        {
            // Arrange
            List<Claim> claims = new List<Claim>();

            string orgNr = "974760223";

            object iso6523Consumer = new 
            {             
               authority = "iso6523-actorid-upis",
               ID = $"9908:{orgNr}"             
            };

            claims.Add(new Claim("consumer", JsonConvert.SerializeObject(iso6523Consumer)));
            claims.Add(new Claim("client_orgno", orgNr));
            claims.Add(new Claim("scope", "altinn:instances.write altinn:instances.read"));

            ClaimsIdentity identity = new ClaimsIdentity(OrganisationIdentity);
            identity.AddClaims(claims);
            ClaimsPrincipal externalPrincipal = new ClaimsPrincipal(identity);

            string externalToken = JwtTokenMock.GenerateToken(externalPrincipal, TimeSpan.FromMinutes(2));
            
            Mock<ISblCookieDecryptionService> cookieDecryptionService = new Mock<ISblCookieDecryptionService>();

            HttpClient client = GetTestClient(cookieDecryptionService.Object);

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", externalToken);

            HttpRequestMessage requestMessage = new HttpRequestMessage(HttpMethod.Get, "/authentication/api/v1/convert");

            // Act
            HttpResponseMessage response = await client.SendAsync(requestMessage);

            // Assert
            string token = await response.Content.ReadAsStringAsync();

            ClaimsPrincipal principal = JwtTokenMock.ValidateToken(token);

            Assert.NotNull(principal);            

            Assert.True(principal.HasClaim(c => c.Type == "urn:altinn:org"));
        }

        /// <summary>
        /// Test of method <see cref="AuthenticationController.AuthenticateOrganisation"/>.
        /// </summary>
        [Fact]
        public async Task AuthenticateOrganisation_RequestTestTokenWithValidExternalToken_ReturnsNewToken()
        {
            // Arrange
            List<Claim> claims = new List<Claim>();

            string orgNr = "974760223";
            string brgOrgNr = "974760673";

            object iso6523Consumer = new
            {
                authority = "iso6523-actorid-upis",
                ID = $"9908:{orgNr}"
            };

            object brgConsumer = new
            {
                authority = "iso6523-actorid-upis",
                ID = $"9908:{brgOrgNr}"
            };

            claims.Add(new Claim("consumer", JsonConvert.SerializeObject(iso6523Consumer)));
            claims.Add(new Claim("client_orgno", orgNr));
            claims.Add(new Claim("scope", "altinn:instances.write altinn:instances.read"));

            ClaimsIdentity identity = new ClaimsIdentity(OrganisationIdentity);
            identity.AddClaims(claims);
            ClaimsPrincipal externalPrincipal = new ClaimsPrincipal(identity);

            string externalToken = JwtTokenMock.GenerateToken(externalPrincipal, TimeSpan.FromMinutes(2));

            Mock<ISblCookieDecryptionService> cookieDecryptionService = new Mock<ISblCookieDecryptionService>();

            HttpClient client = GetTestClient(cookieDecryptionService.Object);

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", externalToken);

            HttpRequestMessage requestMessage = new HttpRequestMessage(HttpMethod.Get, "/authentication/api/v1/convert?test=true");

            // Act
            HttpResponseMessage response = await client.SendAsync(requestMessage);

            // Assert
            string token = await response.Content.ReadAsStringAsync();

            ClaimsPrincipal principal = JwtTokenMock.ValidateToken(token);

            Assert.NotNull(principal);

            Assert.True(principal.HasClaim(c => c.Type == "urn:altinn:org"));

            Assert.Equal("ttd", principal.FindFirst(c => c.Type == "urn:altinn:org").Value);
        }

        /// <summary>
        /// Test of method <see cref="AuthenticationController.AuthenticateOrganisation"/>.
        /// </summary>
        [Fact]
        public async Task AuthenticateUser_RequestTokenWithValidAltinnCookie_ReturnsNewToken()
        {
            // Arrange
            UserAuthenticationModel userAuthenticationModel = new UserAuthenticationModel
            {
                IsAuthenticated = true,
                AuthenticationLevel = SecurityLevel.QuiteSensitive,
                AuthenticationMethod = AuthenticationMethod.AltinnPIN,
                PartyID = 23,
                UserID = 434,
                Username = "bob"
            };

            Mock<ISblCookieDecryptionService> cookieDecryptionService = new Mock<ISblCookieDecryptionService>();
            cookieDecryptionService.Setup(s => s.DecryptTicket(It.IsAny<string>())).ReturnsAsync(userAuthenticationModel);

            HttpClient client = GetTestClient(cookieDecryptionService.Object);

            string url = "/authentication/api/v1/authentication?goto=http%3A%2F%2Flocalhost";
            HttpRequestMessage requestMessage = new HttpRequestMessage(HttpMethod.Get, url);
            requestMessage.Headers.Add("Cookie", ".ASPXAUTH=asdasdasd");

            // Act
            HttpResponseMessage response = await client.SendAsync(requestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.Found, response.StatusCode);

            string token = null;
            string sameSite = null;
            bool httpOnly = false;
            bool sessionCookie = true;

            response.Headers.TryGetValues(HeaderNames.SetCookie, out IEnumerable<string> cookies);
            foreach (string cookie in cookies)
            {
                string[] cookieParts = cookie.Split("; ");
                foreach (string cookiePart in cookieParts)
                {
                    string[] cookieKeyValue = cookiePart.Split('=');

                    switch (cookieKeyValue[0])
                    {
                        case "AltinnStudioRuntime":
                            token = cookieKeyValue[1];
                            break;
                        case "httponly":
                            httpOnly = true;
                            break;
                        case "expires":
                            // Cookies WITHOUT 'expires' are session cookies. They are gone when the browser is closed.
                            sessionCookie = false;
                            break;
                        case "samesite":
                            sameSite = cookieKeyValue[1];
                            break;
                    }
                }
            }
            
            Assert.NotNull(token);
            ClaimsPrincipal principal = JwtTokenMock.ValidateToken(token);
            Assert.NotNull(principal);

            Assert.NotNull(sameSite);
            Assert.Equal("lax", sameSite);

            Assert.True(httpOnly);
            Assert.True(sessionCookie);
        }

        private HttpClient GetTestClient(ISblCookieDecryptionService cookieDecryptionService)
        {
            string projectDir = Directory.GetCurrentDirectory();
            string configPath = Path.Combine(projectDir, "appsettings.json");

            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton(cookieDecryptionService);

                    services.AddSingleton<ISigningKeysRetriever, SigningKeysRetrieverStub>();
                    services.AddSingleton<IJwtSigningCertificateProvider, JwtSigningCertificateProviderStub>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                });
                builder.ConfigureAppConfiguration((context, conf) => { conf.AddJsonFile(configPath); });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

            return client;
        }
    }
}
