using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;
using Moq.Protected;

using Newtonsoft.Json;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation
{
    public class TextClientTest
    {
        private readonly Mock<IOptions<PlatformSettings>> platformSettingsOptions;
        private readonly Mock<IOptions<AppSettings>> appSettingsOptions;
        private readonly Mock<HttpMessageHandler> handlerMock;
        private readonly Mock<IHttpContextAccessor> contextAccessor;
        private readonly Mock<ILogger<TextClient>> logger;
        private readonly IMemoryCache memoryCache;

        public TextClientTest()
        {
            platformSettingsOptions = new Mock<IOptions<PlatformSettings>>();
            appSettingsOptions = new Mock<IOptions<AppSettings>>();
            handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            contextAccessor = new Mock<IHttpContextAccessor>();
            logger = new Mock<ILogger<TextClient>>();

            var services = new ServiceCollection();
            services.AddMemoryCache();
            var serviceProvider = services.BuildServiceProvider();

            memoryCache = serviceProvider.GetService<IMemoryCache>();
        }

        [Fact]
        public async Task GetAppTextNb_SuccessfulCallToStorage()
        {
            // Arrange
            memoryCache.Remove("org-app-nb");
            TextResource texts = new TextResource { Language = "nb" };

            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonConvert.SerializeObject(texts), Encoding.UTF8, "application/json"),
            };

            InitializeMocks(httpResponseMessage, "texts");
            HttpClient httpClient = new HttpClient(handlerMock.Object);
            TextClient target = new TextClient(appSettingsOptions.Object, platformSettingsOptions.Object, logger.Object, contextAccessor.Object, httpClient, memoryCache);

            // Act
            await target.GetText("org", "app", "nb");

            // Assert
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task GetAppTextNb_TextSuccessfullyRetrievedFromCache()
        {
            // Arrange
            memoryCache.Remove("org-app-nb");
            TextResource texts = new TextResource { Language = "nb" };
            memoryCache.Set("org-app-nb", texts);

            InitializeMocks(new HttpResponseMessage(), "texts");

            HttpClient httpClient = new HttpClient(handlerMock.Object);
            TextClient target = new TextClient(appSettingsOptions.Object, platformSettingsOptions.Object, logger.Object, contextAccessor.Object, httpClient, memoryCache);

            // Act
            TextResource actual = await target.GetText("org", "app", "nb");

            // Assert
            Assert.Equal(texts.Language, actual.Language);
        }

        [Fact]
        public async Task GetAppTextNb_StorageReturnsError()
        {
            // Arrange
            memoryCache.Remove("org-app-nb");

            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.InternalServerError
            };

            InitializeMocks(httpResponseMessage, "texts");
            HttpClient httpClient = new HttpClient(handlerMock.Object);
            TextClient target = new TextClient(appSettingsOptions.Object, platformSettingsOptions.Object, logger.Object, contextAccessor.Object, httpClient, memoryCache);

            // Act
            TextResource actual = await target.GetText("org", "app", "nb");

            // Assert
            Assert.Null(actual);
        }

        private void InitializeMocks(HttpResponseMessage httpResponseMessage, string urlPart)
        {
            PlatformSettings platformSettings = new PlatformSettings { ApiStorageEndpoint = "http://localhost", SubscriptionKey = "key" };
            platformSettingsOptions.Setup(s => s.Value).Returns(platformSettings);

            AppSettings appSettings = new AppSettings { RuntimeCookieName = "AltinnStudioRuntime" };
            appSettingsOptions.Setup(s => s.Value).Returns(appSettings);

            contextAccessor.Setup(s => s.HttpContext).Returns(new DefaultHttpContext());

            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(p => p.RequestUri.ToString().Contains(urlPart)),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(httpResponseMessage)
                .Verifiable();
        }
    }
}
