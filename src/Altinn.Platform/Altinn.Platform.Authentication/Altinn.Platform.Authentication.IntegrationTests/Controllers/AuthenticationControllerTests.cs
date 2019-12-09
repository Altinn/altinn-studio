using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Controllers;
using Altinn.Platform.Authentication.IntegrationTests.Fakes;
using Altinn.Platform.Authentication.Maskinporten;
using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

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
            this._factory = factory;
        }

        /// <summary>
        /// Test of method <see cref="AuthenticationController.AuthenticateOrganisation"/>.
        /// </summary>
        [Fact]
        public async Task OrganisationAuthentication()
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

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", externalToken);

            HttpRequestMessage requestMessage = new HttpRequestMessage(HttpMethod.Get, "/authentication/api/v1/convert");

            // Act
            HttpResponseMessage response = await client.SendAsync(requestMessage);

            // Assert
            string token = await response.Content.ReadAsStringAsync();

            ClaimsPrincipal principal = JwtTokenMock.ValidateToken(token);

            Assert.NotNull(principal);            

            Assert.True(principal.HasClaim(c => c.Type == "org"));
        }

        private HttpClient GetTestClient()
        {
            string projectDir = Directory.GetCurrentDirectory();
            string configPath = Path.Combine(projectDir, "appsettings.json");

            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<ISigningKeysRetriever, SigningKeysRetrieverStub>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                });
                builder.ConfigureAppConfiguration((context, conf) => { conf.AddJsonFile(configPath); });
            }).CreateClient();

            return client;
        }
    }
}
