using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.TypedHttpClients.AltinnAuthentication;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;
using Moq.Protected;

using Xunit;

namespace Designer.Tests.TypedHttpClients
{
    public class AltinnAuthenticationClientTest
    {
        private readonly Mock<IOptionsMonitor<PlatformSettings>> _platformSettingsOptions;
        private readonly Mock<ILogger<AltinnAuthenticationClient>> _logger;
        private readonly Mock<HttpMessageHandler> _handlerMock;

        public AltinnAuthenticationClientTest()
        {
            _platformSettingsOptions = new();
            _logger = new();
            _handlerMock = new(MockBehavior.Strict);
        }

        [Fact]
        public async Task ConvertTokenAsync_ResponseIsPlainText_ParsingResponseSuccessfully()
        {
            // Arrange
            HttpRequestMessage actualRequest = null;

            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("this is an exchanged token", Encoding.UTF8, "plain/text")
            };

            void SetRequest(HttpRequestMessage request) => actualRequest = request;
            InitializeMocks(httpResponseMessage, SetRequest);
            var sut = new AltinnAuthenticationClient(new HttpClient(_handlerMock.Object), _platformSettingsOptions.Object, _logger.Object);

            // Act
            await sut.ConvertTokenAsync("this is a random token", new Uri("https://platform.at22.altinn.cloud/storage/api/v1/instances"));

            Assert.NotNull(actualRequest);
            Assert.Equal(HttpMethod.Get, actualRequest.Method);
        }

        [Fact]
        public async Task ConvertTokenAsync_ResponseIsApplicationJson_ParsingResponseSuccessfully()
        {
            // Arrange
            HttpRequestMessage actualRequest = null;

            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("this is an exchanged token", Encoding.UTF8, "application/json")
            };

            void SetRequest(HttpRequestMessage request) => actualRequest = request;
            InitializeMocks(httpResponseMessage, SetRequest);
            var sut = new AltinnAuthenticationClient(new HttpClient(_handlerMock.Object), _platformSettingsOptions.Object, _logger.Object);

            // Act
            await sut.ConvertTokenAsync("this is a random token", new Uri("https://platform.at22.altinn.cloud/storage/api/v1/instances"));

            Assert.NotNull(actualRequest);
            Assert.Equal(HttpMethod.Get, actualRequest.Method);
        }

        private void InitializeMocks(HttpResponseMessage httpResponseMessage, Action<HttpRequestMessage> callback)
        {
            PlatformSettings platformSettings = new PlatformSettings
            {
                SubscriptionKeyHeaderName = "HeaderName",
                ApiAuthenticationConvertUri = "authentication/api/v1/exchange/altinnstudio"
            };

            _platformSettingsOptions.Setup(s => s.CurrentValue).Returns(platformSettings);

            GeneralSettings generalSettings = new GeneralSettings
            {
                HostName = "at22.altinn.cloud"
            };

            _handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .Callback<HttpRequestMessage, CancellationToken>((request, _) => callback(request))
                .ReturnsAsync(httpResponseMessage)
                .Verifiable();
        }
    }
}
