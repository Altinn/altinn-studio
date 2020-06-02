using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

using Moq;
using Moq.Protected;

using Newtonsoft.Json;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation
{
    public class InstanceAppSITests
    {
        private readonly Mock<IOptions<PlatformSettings>> platformSettingsOptions;
        private readonly Mock<IOptionsMonitor<AppSettings>> appSettingsOptions;
        private readonly Mock<HttpMessageHandler> handlerMock;
        private readonly Mock<IHttpContextAccessor> contextAccessor;

        public InstanceAppSITests()
        {
            platformSettingsOptions = new Mock<IOptions<PlatformSettings>>();
            appSettingsOptions = new Mock<IOptionsMonitor<AppSettings>>();
            handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            contextAccessor = new Mock<IHttpContextAccessor>();
        }

        [Fact]
        public async Task AddCompleteConfirmation_SuccessfulCall()
        {
            // Arrange
            Instance instance = new Instance { CompleteConfirmations = new List<CompleteConfirmation> { new CompleteConfirmation { StakeholderId = "test" } } };
            InitializeMocks(instance);

            HttpClient httpClient = new HttpClient(handlerMock.Object);

            InstanceAppSI target = new InstanceAppSI(platformSettingsOptions.Object, null, contextAccessor.Object, httpClient, appSettingsOptions.Object);

            // Act
            await target.AddCompleteConfirmation(1337, Guid.NewGuid());

            // Assert
            handlerMock.VerifyAll();
        }

        private void InitializeMocks(Instance instance)
        {
            PlatformSettings platformSettings = new PlatformSettings { ApiStorageEndpoint = "http://localhost", SubscriptionKey = "key"};
            platformSettingsOptions.Setup(s => s.Value).Returns(platformSettings);

            AppSettings appSettings = new AppSettings{RuntimeCookieName = "AltinnStudioRuntime"};
            appSettingsOptions.Setup(s => s.CurrentValue).Returns(appSettings);

            contextAccessor.Setup(s => s.HttpContext).Returns(new DefaultHttpContext());

            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonConvert.SerializeObject(instance), Encoding.UTF8, "application/json"),
            };

            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.Is<HttpRequestMessage>(p => p.RequestUri.ToString().EndsWith("complete")),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(httpResponseMessage)
                .Verifiable();
        }
    }
}
