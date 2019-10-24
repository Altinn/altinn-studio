using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.IntegrationTests;
using Altinn.Platform.Authentication.Maskinporten;

using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Authentication.Controllers
{
    /// <summary>
    /// Represents a collection of unit test with all integration tests of the <see cref="AuthenticationController"/> class.
    /// </summary>
    public class AuthenticationControllerTest : IClassFixture<CustomWebApplicationFactory<Startup>>
    {
        private const string OrganisationIdentity = "OrganisationLogin";
        private readonly CustomWebApplicationFactory<Startup> factory;

        /// <summary>
        /// Initialises a new instance of the <see cref="AuthenticationControllerTest"/> class with the given CustomWebApplicationFactory.
        /// </summary>
        /// <param name="factory">The CustomWebApplicationFactory to use when creating a test server.</param>
        public AuthenticationControllerTest(CustomWebApplicationFactory<Startup> factory)
        {
            this.factory = factory;
        }

        /// <summary>
        /// Test of method <see cref="AuthenticationController.AuthenticateOrganisation"/>.
        /// </summary>
        [Fact]
        public async Task OrganisationAuthenticationWithMaskinportenToken()
        {
            string externalToken = "eyJraWQiOiJjWmswME1rbTVIQzRnN3Z0NmNwUDVGSFpMS0pzdzhmQkFJdUZiUzRSVEQ0IiwiYWxnIjoiUlMyNTYifQ.eyJhdWQiOiJodHRwczpcL1wvdHQwMi5hbHRpbm4ubm9cL21hc2tpbnBvcnRlbi1hcGlcLyIsInNjb3BlIjoiYWx0aW5uOmluc3RhbmNlcy53cml0ZSIsImlzcyI6Imh0dHBzOlwvXC9vaWRjLXZlcjIuZGlmaS5ub1wvaWRwb3J0ZW4tb2lkYy1wcm92aWRlclwvIiwiY2xpZW50X2FtciI6InZpcmtzb21oZXRzc2VydGlmaWthdCIsInRva2VuX3R5cGUiOiJCZWFyZXIiLCJleHAiOjE1NzE5MjE2MTYsImlhdCI6MTU3MTkwOTYxNiwiY2xpZW50X2lkIjoiMGRlMTlmN2EtZjVmYS00NWQxLTg3NGMtM2QyZTg4Y2U5N2Q5IiwiY2xpZW50X29yZ25vIjoiOTc0NzYwNjczIiwianRpIjoiYWE3SjViX1hPcmM4b29qQ3lEUGR6MkNkNktjX3pRci1qcmJfSzc0eDBkUSIsImNvbnN1bWVyIjp7ImF1dGhvcml0eSI6ImlzbzY1MjMtYWN0b3JpZC11cGlzIiwiSUQiOiIwMTkyOjk3NDc2MDY3MyJ9fQ.vXlTvqE2k6W_Wmr5gB7wUX2Fb5n34KXx-8hIaI4fO5lpjTHmWtg2B3Gn6jihBJioaVKYflCzspVx6XZZxN2kTqZ6N0JgBsqpKSSlP7FQGm10vaj90ZV6LCKSvUFkY5CcSNVUvihza0aBzTll1K_w8hCD-5Ix0zf45oUHY4CPxymI7Cod3YaXPkesDLbwkX3rreATMis-IOmNl8wpwGIE3AujDDqgCWLhK75spTrMVR74k4EqWsUxKmAIC5cDu5AmE0-UI-8CUpNqSp6f6SmxNycq94K86u-8lFZOU2ene18GEmcQ6Ddd9e8jNcR7vjtIQiJe8O2nw8StQ1CXt7NTEg";
            HttpClient client = GetClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", externalToken);

            HttpRequestMessage requestMessage = new HttpRequestMessage(HttpMethod.Get, "/authentication/api/v1/convert");

            // Act
            HttpResponseMessage response = await client.SendAsync(requestMessage);

            // Assert
            string token = await response.Content.ReadAsStringAsync();

            ClaimsPrincipal principal = JwtTokenMock.ValidateToken(token);

            Assert.NotNull(principal);

            Assert.True(principal.HasClaim(c => c.Type == "org"));

            Assert.Equal("974760673", principal.Claims.First(c => c.Type == "orgNumber").Value);
            Assert.Equal("brg", principal.Claims.First(c => c.Type == "org").Value);
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

        private HttpClient GetClient()
        {
            string projectDir = Directory.GetCurrentDirectory();
            string configPath = Path.Combine(projectDir, "appsettings.json");

            HttpClient client = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services => { services.AddSingleton<ISigningKeysRetriever, SigningKeysRetriever>(); });
                builder.ConfigureAppConfiguration((context, conf) => { conf.AddJsonFile(configPath); });
            }).CreateClient();

            return client;
        }

        private HttpClient GetTestClient()
        {
            string projectDir = Directory.GetCurrentDirectory();
            string configPath = Path.Combine(projectDir, "appsettings.json");

            HttpClient client = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services => { services.AddSingleton<ISigningKeysRetriever, TestSigningKeysRetriever>(); });
                builder.ConfigureAppConfiguration((context, conf) => { conf.AddJsonFile(configPath); });
            }).CreateClient();

            return client;
        }
    }
}
