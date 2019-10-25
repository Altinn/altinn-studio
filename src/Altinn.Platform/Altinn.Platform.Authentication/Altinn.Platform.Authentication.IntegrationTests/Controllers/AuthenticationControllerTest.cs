using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Controllers;
using Altinn.Platform.Authentication.Maskinporten;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Authentication.IntegrationTests
{
    /// <summary>
    /// Represents a collection of unit test with all integration tests of the <see cref="AuthenticationController"/> class.
    /// </summary>
    public class AuthenticationControllerTest : IClassFixture<WebApplicationFactory<Startup>>
    {
        private const string OrganisationIdentity = "OrganisationLogin";
        private readonly WebApplicationFactory<Startup> factory;

        /// <summary>
        /// Initialises a new instance of the <see cref="AuthenticationControllerTest"/> class with the given WebApplicationFactory.
        /// </summary>
        /// <param name="factory">The WebApplicationFactory to use when creating a test server.</param>
        public AuthenticationControllerTest(WebApplicationFactory<Startup> factory)
        {
            this.factory = factory;
        }

        /// <summary>
        /// Test of method <see cref="AuthenticationController.AuthenticateOrganisation"/>.
        /// </summary>
        [Fact]
        public async Task OrganisationAuthenticationWithMaskinportenToken()
        {
            string externalToken = "eyJraWQiOiJjWmswME1rbTVIQzRnN3Z0NmNwUDVGSFpMS0pzdzhmQkFJdUZiUzRSVEQ0IiwiYWxnIjoiUlMyNTYifQ.eyJhdWQiOiJodHRwczpcL1wvdHQwMi5hbHRpbm4ubm9cL21hc2tpbnBvcnRlbi1hcGlcLyIsInNjb3BlIjoiYWx0aW5uOmluc3RhbmNlcy5yZWFkIGFsdGlubjppbnN0YW5jZXMud3JpdGUiLCJpc3MiOiJodHRwczpcL1wvb2lkYy12ZXIyLmRpZmkubm9cL2lkcG9ydGVuLW9pZGMtcHJvdmlkZXJcLyIsImNsaWVudF9hbXIiOiJ2aXJrc29taGV0c3NlcnRpZmlrYXQiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwIjoxNTcyMDAzNzE0LCJpYXQiOjE1NzE5OTE3MTQsImNsaWVudF9pZCI6IjBkZTE5ZjdhLWY1ZmEtNDVkMS04NzRjLTNkMmU4OGNlOTdkOSIsImNsaWVudF9vcmdubyI6Ijk3NDc2MDY3MyIsImp0aSI6IkJjTklBdVpLWGRqcEVDbW13YWxBbS1wY0JwMGlOYzU2VDZlWGhseE5CWkUiLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5NzQ3NjA2NzMifX0.OHUF7aSlxKFpVzK8j_NVLvA3sALKwlIXzwhb4K2WyAo9bmlHNhp5nW7qjJssXRpNb-btgJn1wcKnK4H-0FE2wj82OmJKDxIcfDgy3vvdAwiTLaG-wbZqZxSpRIErl7FMbRAotwqe1ioPEQLXOO17LZv5MOwUkp54ftf9RLv3jd01WViESWwPDbcKd5jfLC5HRvnta_RHUBsOHwH_of7ivOPmwBmP23MIj6m3KQkYLahPNaPU4TLoywrUUmaEvL4zOXqhhMu0_D_k49S0ZtDTU80ItEEH9-ra-nFdpqu_Y5IeeQ-xc2Lt3n2-K9ff5MN9Xk3o1yR22epbNkSYafxcRQ";
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
