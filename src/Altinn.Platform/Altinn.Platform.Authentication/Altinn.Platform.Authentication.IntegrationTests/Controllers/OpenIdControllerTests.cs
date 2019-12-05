using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Controllers;
using Altinn.Platform.Authentication.IntegrationTests.Fakes;
using Altinn.Platform.Authentication.Maskinporten;
using Altinn.Platform.Authentication.Model;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using Xunit;

namespace Altinn.Platform.Authentication.IntegrationTests.Controllers
{
    /// <summary>
    /// Represents a collection of unit test with all integration tests of the <see cref="OpenIdController"/> class.
    /// </summary>
    public class OpenIdControllerTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;

        /// <summary>
        /// Initialises a new instance of the <see cref="OpenIdControllerTests"/> class with the given WebApplicationFactory.
        /// </summary>
        /// <param name="factory">The WebApplicationFactory to use when creating a test server.</param>
        public OpenIdControllerTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Test of method <see cref="OpenIdController.GetOpenIdConfiguration"/>.
        /// </summary>
        [Fact]
        public async Task GetOpenIdConfiguration()
        {
            // Arrange
            HttpClient client = GetTestClient();

            HttpRequestMessage requestMessage = new HttpRequestMessage(HttpMethod.Get, "/authentication/api/v1/OpenId/.well-known/openid-configuration");

            // Act
            HttpResponseMessage response = await client.SendAsync(requestMessage);

            // Assert
            string json = await response.Content.ReadAsStringAsync();

            DiscoveryDocument discoveryDocument = JsonSerializer.Deserialize<DiscoveryDocument>(json);

            Assert.NotNull(discoveryDocument);
            Assert.EndsWith("jwks", discoveryDocument.JwksUri);
        }

        /// <summary>
        /// Test of method <see cref="OpenIdController.GetJsonWebKeySet"/>.
        /// </summary>
        [Fact]
        public async Task GetJsonWebKeySet()
        {
            // Arrange
            HttpClient client = GetTestClient();

            HttpRequestMessage requestMessage = new HttpRequestMessage(HttpMethod.Get, "/authentication/api/v1/openid/.well-known/openid-configuration/jwks");

            // Act
            HttpResponseMessage response = await client.SendAsync(requestMessage);

            // Assert
            string json = await response.Content.ReadAsStringAsync();

            JwksDocument jwksDocument = JsonSerializer.Deserialize<JwksDocument>(json);

            Assert.NotNull(jwksDocument);
            Assert.Single(jwksDocument.Keys);
            Assert.Equal("AQAB", jwksDocument.Keys[0].Exponent);
            Assert.Equal("RSA", jwksDocument.Keys[0].KeyType);
            Assert.Equal("sig", jwksDocument.Keys[0].PublicKeyUse);
        }

        private HttpClient GetTestClient()
        {
            string projectDir = Directory.GetCurrentDirectory();
            string configPath = Path.Combine(projectDir, "appsettings.json");

            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services => { services.AddSingleton<ISigningKeysRetriever, SigningKeysRetrieverStub>(); });
                builder.ConfigureAppConfiguration((context, conf) => { conf.AddJsonFile(configPath); });
            }).CreateClient();

            return client;
        }
    }
}
