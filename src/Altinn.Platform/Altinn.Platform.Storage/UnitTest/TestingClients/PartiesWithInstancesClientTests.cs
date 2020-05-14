using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Configuration;

using Microsoft.Extensions.Options;

using Moq;
using Moq.Protected;
using Xunit;

namespace Altinn.Platform.Storage.UnitTest.TestingClients
{
    public class PartiesWithInstancesClientTests
    {
        [Fact]
        public async Task SetHasAltinn3Instances_InputPartyId_LogicCallsCorrectEndpoint()
        {
            // Arrange
            int instanceOwnerPartyId = 568198;

            IOptions<GeneralSettings> generalSettings = Options.Create(new GeneralSettings());
            generalSettings.Value.BridgeApiAuthorizationEndpoint = new Uri("https://bridge.altinn.no/authorization/api/");

            HttpRequestMessage requestMessage = null;

            Mock<HttpMessageHandler> mockHttpMessageHandler = new Mock<HttpMessageHandler>();
            mockHttpMessageHandler.Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
                .Callback<HttpRequestMessage, CancellationToken>((rm, ct) => requestMessage = rm)
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK
                });

            HttpClient httpClient = new HttpClient(mockHttpMessageHandler.Object);
            PartiesWithInstancesClient target = new PartiesWithInstancesClient(httpClient, generalSettings);

            // Act
            await target.SetHasAltinn3Instances(instanceOwnerPartyId);

            // Assert
            Assert.NotNull(requestMessage);
            Assert.Equal("POST", requestMessage.Method.ToString());
            Assert.EndsWith("partieswithinstances", requestMessage.RequestUri.ToString());

            string jsonContent = await requestMessage.Content.ReadAsStringAsync();

            Assert.Equal(instanceOwnerPartyId.ToString(), jsonContent);
        }
    }
}
