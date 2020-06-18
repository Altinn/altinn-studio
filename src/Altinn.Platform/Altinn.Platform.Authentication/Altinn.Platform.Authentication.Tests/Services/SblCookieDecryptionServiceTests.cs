using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Configuration;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;
using Moq.Protected;

using Xunit;

namespace Altinn.Platform.Authentication.Tests.Services
{
    /// <summary>
    /// Represents a collection of unit test, testing the <see cref="SblCookieDecryptionService"/> class.
    /// </summary>
    public class SblCookieDecryptionServiceTests
    {
        private readonly Mock<HttpMessageHandler> _handlerMock;
        private readonly Mock<IOptions<GeneralSettings>> _generalSettingsOptions;
        private readonly Mock<ILogger<SblCookieDecryptionService>> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SblCookieDecryptionServiceTests"/> class.
        /// </summary>
        public SblCookieDecryptionServiceTests()
        {
            _generalSettingsOptions = new Mock<IOptions<GeneralSettings>>();
            _handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            _logger = new Mock<ILogger<SblCookieDecryptionService>>();
        }

        /// <summary>
        /// Testing the <see cref="SblCookieDecryptionService.DecryptTicket"/> method.
        /// </summary>
        [Fact]
        public async Task DecryptTicket_SblBridgeResponseIsOk_ReturnsUserModel()
        {
            // Arrange
            UserAuthenticationModel userModel = new UserAuthenticationModel();
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(userModel), Encoding.UTF8, "application/json"),
            };

            InitializeMocks(httpResponseMessage);

            HttpClient httpClient = new HttpClient(_handlerMock.Object);
            SblCookieDecryptionService target = new SblCookieDecryptionService(httpClient, _generalSettingsOptions.Object, _logger.Object);

            // Act
            UserAuthenticationModel actual = await target.DecryptTicket("random and irrelevant bytes");

            // Assert
            _handlerMock.VerifyAll();

            Assert.NotNull(actual);
        }

        /// <summary>
        /// Testing the <see cref="SblCookieDecryptionService.DecryptTicket"/> method.
        /// </summary>
        [Fact]
        public async Task DecryptTicket_SblBridgeResponseIsServiceUnavailable_ThrowsException()
        {
            // Arrange
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.ServiceUnavailable,
                ReasonPhrase = "Service Unavailable"
            };

            InitializeMocks(httpResponseMessage);

            HttpClient httpClient = new HttpClient(_handlerMock.Object);
            SblCookieDecryptionService target = new SblCookieDecryptionService(httpClient, _generalSettingsOptions.Object, _logger.Object);

            SblBridgeResponseException actual = null;

            // Act
            try
            {
                await target.DecryptTicket("random and irrelevant bytes");
            }
            catch (SblBridgeResponseException e)
            {
                actual = e;
            }

            // Assert
            _handlerMock.VerifyAll();

            Assert.NotNull(actual);
            Assert.Contains("ServiceUnavailable", actual.Message);
        }

        /// <summary>
        /// Testing the <see cref="SblCookieDecryptionService.DecryptTicket"/> method.
        /// </summary>
        [Fact]
        public async Task DecryptTicket_SblBridgeResponseIsBadRequest_ReturnsNull()
        {
            // Arrange
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.BadRequest,
                ReasonPhrase = "Service Unavailable"
            };

            InitializeMocks(httpResponseMessage);

            HttpClient httpClient = new HttpClient(_handlerMock.Object);
            SblCookieDecryptionService target = new SblCookieDecryptionService(httpClient, _generalSettingsOptions.Object, _logger.Object);

            // Act
            UserAuthenticationModel actual = await target.DecryptTicket("random and irrelevant bytes");

            // Assert
            _handlerMock.VerifyAll();

            Assert.Null(actual);
        }

        private void InitializeMocks(HttpResponseMessage httpResponseMessage)
        {
            GeneralSettings generalSettings = new GeneralSettings { BridgeAuthnApiEndpoint = "http://localhost" };
            _generalSettingsOptions.Setup(s => s.Value).Returns(generalSettings);

            _handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(r => r.RequestUri.ToString().Contains("tickets")),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(httpResponseMessage)
                .Verifiable();
        }
    }
}
