using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Controllers;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;
using Altinn.Platform.Authentication.Tests.Fakes;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

using Xunit;

namespace Altinn.Platform.Authentication.Tests.Controllers
{
    /// <summary>
    /// Represents a collection of unit test with all integration tests of the <see cref="OpenIdController"/> class.
    /// </summary>
    public class OpenIdControllerTests : IClassFixture<WebApplicationFactory<OpenIdController>>
    {
        private readonly WebApplicationFactory<OpenIdController> _factory;

        /// <summary>
        /// Initialises a new instance of the <see cref="OpenIdControllerTests"/> class with the given WebApplicationFactory.
        /// </summary>
        /// <param name="factory">The WebApplicationFactory to use when creating a test server.</param>
        public OpenIdControllerTests(WebApplicationFactory<OpenIdController> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Test of method <see cref="OpenIdController.GetOpenIdConfigurationAsync"/>.
        /// </summary>
        [Fact]
        public async Task GetOpenIdConfigurationAsync_RequestMainConfigurationDocument_ReturnsCorrectSettings()
        {
            // Arrange
            HttpClient client = GetTestClient();

            HttpRequestMessage requestMessage = new HttpRequestMessage(HttpMethod.Get, "/authentication/api/v1/openid/.well-known/openid-configuration");

            // Act
            HttpResponseMessage response = await client.SendAsync(requestMessage);

            // Assert
            string json = await response.Content.ReadAsStringAsync();

            DiscoveryDocument discoveryDocument = JsonSerializer.Deserialize<DiscoveryDocument>(json);

            Assert.NotNull(discoveryDocument);
            Assert.EndsWith("jwks", discoveryDocument.JwksUri);
        }

        /// <summary>
        /// Test of method <see cref="OpenIdController.GetJsonWebKeySetAsync"/>.
        /// </summary>
        [Fact]
        public async Task GetJsonWebKeySetAsync_RequestKeySet_ReturnsCorrectKeys()
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
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<IJwtSigningCertificateProvider, JwtSigningCertificateProviderStub>();
                });
            }).CreateClient();

            return client;
        }
    }
}
