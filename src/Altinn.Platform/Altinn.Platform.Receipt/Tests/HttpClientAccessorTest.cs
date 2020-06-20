using System.Net.Http;
using Altinn.Platform.Receipt.Clients;
using Altinn.Platform.Receipt.Configuration;

using Microsoft.Extensions.Options;

using Xunit;

namespace Altinn.Platform.Receipt.Tests
{
    public class UnitTests
    {
        public class HttpClientAccessorTest
        {
            private HttpClientAccessor _httpClientAccessor;
            private readonly string registerEndpoint = "http://registerendpoint.com/api/v1/";
            private readonly string profileEndpoint = "http://profileendpoint.com/api/v1/";
            private readonly string storageEndpoint = "http://storageendpoint.com/api/v1/";
            private readonly string subscriptionKey = "72D7CAD7-1B89-4940-A0E4-64C2196DBCB8";

            [Fact]
            public void TC01_InstantiateClients_ValidateParameters()
            {
                // Arrange
                _httpClientAccessor = new HttpClientAccessor(Options.Create(
                    new PlatformSettings
                    {
                        ApiProfileEndpoint = profileEndpoint,
                        ApiRegisterEndpoint = registerEndpoint,
                        ApiStorageEndpoint = storageEndpoint,
                        SubscriptionKey = subscriptionKey
                    }));

                // Act
                HttpClient profileClient = _httpClientAccessor.ProfileClient;
                HttpClient registerClient = _httpClientAccessor.RegisterClient;
                HttpClient storageClient = _httpClientAccessor.StorageClient;

                // Assert
                Assert.NotNull(profileClient);
                Assert.NotNull(registerClient);
                Assert.NotNull(storageClient);
                Assert.Equal(profileEndpoint, profileClient.BaseAddress.ToString());
                Assert.Equal(registerEndpoint, registerClient.BaseAddress.ToString());
                Assert.Equal(storageEndpoint, storageClient.BaseAddress.ToString());
                Assert.True(profileClient.DefaultRequestHeaders.Contains("Ocp-Apim-Subscription-Key"));
            }
        }
    }
}
