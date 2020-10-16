using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Events.Configuration;
using Altinn.Platform.Events.Exceptions;
using Altinn.Platform.Events.Services;
using Altinn.Platform.Register.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;

using Xunit;
using Xunit.Sdk;

namespace Altinn.Platform.Events.Tests.TestingServices
{
    public class RegisterServiceTest
    {
        private readonly Mock<IOptions<PlatformSettings>> _platformSettings;
        private readonly Mock<IOptions<GeneralSettings>> _generalSettings;
        private readonly Mock<HttpMessageHandler> _handlerMock;
        private readonly Mock<IHttpContextAccessor> _contextAccessor;
        private readonly Mock<IAccessTokenGenerator> _accessTokenGenerator;

        public RegisterServiceTest()
        {
            _platformSettings = new Mock<IOptions<PlatformSettings>>();
            _generalSettings = new Mock<IOptions<GeneralSettings>>();
            _handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            _contextAccessor = new Mock<IHttpContextAccessor>();
            _accessTokenGenerator = new Mock<IAccessTokenGenerator>();
        }

        [Fact]
        public async Task PartyLookup_MatchFound_IdReturned()
        {
            // Arrange
            Party party = new Party
            {
                PartyId = 500000,
                OrgNumber = "897069650",
            };
            int expected = 500000;
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(party), Encoding.UTF8, "application/json")
            };

            HttpRequestMessage actualRequest = null;
            void SetRequest(HttpRequestMessage request) => actualRequest = request;
            InitializeMocks(httpResponseMessage, SetRequest);

            HttpClient httpClient = new HttpClient(_handlerMock.Object);

            RegisterService target = new RegisterService(
                httpClient,
                _contextAccessor.Object,
                _accessTokenGenerator.Object,
                _generalSettings.Object,
                _platformSettings.Object,
                new Mock<ILogger<RegisterService>>().Object);

            // Act
            int actual = await target.PartyLookup("897069650", null);

            // Assert
            Assert.Equal(expected, actual);
            _handlerMock.VerifyAll();
        }

        [Fact]
        public async Task PartyLookup_ResponseIsNotSuccessful_PlatformExceptionThrown()
        {
            // Arrange
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.NotFound,
                Content = new StringContent(string.Empty)
            };

            HttpRequestMessage actualRequest = null;
            void SetRequest(HttpRequestMessage request) => actualRequest = request;
            InitializeMocks(httpResponseMessage, SetRequest);

            HttpClient httpClient = new HttpClient(_handlerMock.Object);

            RegisterService target = new RegisterService(
                httpClient,
                _contextAccessor.Object,
                _accessTokenGenerator.Object,
                _generalSettings.Object,
                _platformSettings.Object,
                new Mock<ILogger<RegisterService>>().Object);

            // Act & Assert
            await Assert.ThrowsAsync<PlatformHttpException>(async () => { await target.PartyLookup("16069412345", null); });
        }

        private void InitializeMocks(HttpResponseMessage httpResponseMessage, Action<HttpRequestMessage> callback)
        {
            PlatformSettings platformSettings = new PlatformSettings
            {
                ApiRegisterEndpoint = "http://localhost:5101/register/api/v1/"
            };

            _platformSettings.Setup(s => s.Value).Returns(platformSettings);

            GeneralSettings generalSettings = new GeneralSettings
            {
                JwtCookieName = "AltinnStudioRuntime"
            };

            _generalSettings.Setup(s => s.Value).Returns(generalSettings);

            _contextAccessor.Setup(s => s.HttpContext).Returns(new DefaultHttpContext());

            _accessTokenGenerator.Setup(s => s.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(string.Empty);

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
