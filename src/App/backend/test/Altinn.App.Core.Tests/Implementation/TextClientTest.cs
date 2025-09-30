#nullable disable
using System.Net;
using System.Text;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.Language;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Newtonsoft.Json;

namespace Altinn.App.PlatformServices.Tests.Implementation;

public class TextClientTest
{
    private readonly Mock<IOptions<PlatformSettings>> _platformSettingsOptions;
    private readonly Mock<IOptions<AppSettings>> _appSettingsOptions;
    private readonly Mock<HttpMessageHandler> _handlerMock;
    private readonly Mock<IHttpContextAccessor> _contextAccessor;
    private readonly Mock<ILogger<TextClient>> _logger;
    private readonly IMemoryCache _memoryCache;

    public TextClientTest()
    {
        _platformSettingsOptions = new Mock<IOptions<PlatformSettings>>();
        _appSettingsOptions = new Mock<IOptions<AppSettings>>();
        _handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        _contextAccessor = new Mock<IHttpContextAccessor>();
        _logger = new Mock<ILogger<TextClient>>();

        var services = new ServiceCollection();
        services.AddMemoryCache();
        var serviceProvider = services.BuildStrictServiceProvider();

        _memoryCache = serviceProvider.GetService<IMemoryCache>();
    }

    [Fact]
    public async Task GetAppTextNb_SuccessfulCallToStorage()
    {
        // Arrange
        _memoryCache.Remove("org-app-nb");
        TextResource texts = new TextResource { Language = LanguageConst.Nb };

        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonConvert.SerializeObject(texts), Encoding.UTF8, "application/json"),
        };

        InitializeMocks(httpResponseMessage, "texts");
        HttpClient httpClient = new HttpClient(_handlerMock.Object);
        TextClient target = new TextClient(
            _appSettingsOptions.Object,
            _platformSettingsOptions.Object,
            _logger.Object,
            _contextAccessor.Object,
            httpClient,
            _memoryCache
        );

        // Act
        await target.GetText("org", "app", "nb");

        // Assert
        _handlerMock.VerifyAll();
    }

    [Fact]
    public async Task GetAppTextNb_TextSuccessfullyRetrievedFromCache()
    {
        // Arrange
        _memoryCache.Remove("org-app-nb");
        TextResource texts = new TextResource { Language = LanguageConst.Nb };
        _memoryCache.Set("org-app-nb", texts);

        InitializeMocks(new HttpResponseMessage(), "texts");

        HttpClient httpClient = new HttpClient(_handlerMock.Object);
        TextClient target = new TextClient(
            _appSettingsOptions.Object,
            _platformSettingsOptions.Object,
            _logger.Object,
            _contextAccessor.Object,
            httpClient,
            _memoryCache
        );

        // Act
        TextResource actual = await target.GetText("org", "app", "nb");

        // Assert
        Assert.Equal(texts.Language, actual.Language);
    }

    [Fact]
    public async Task GetAppTextNb_StorageReturnsError()
    {
        // Arrange
        _memoryCache.Remove("org-app-nb");

        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.InternalServerError,
        };

        InitializeMocks(httpResponseMessage, "texts");
        HttpClient httpClient = new HttpClient(_handlerMock.Object);
        TextClient target = new TextClient(
            _appSettingsOptions.Object,
            _platformSettingsOptions.Object,
            _logger.Object,
            _contextAccessor.Object,
            httpClient,
            _memoryCache
        );

        // Act
        TextResource actual = await target.GetText("org", "app", "nb");

        // Assert
        Assert.Null(actual);
    }

    private void InitializeMocks(HttpResponseMessage httpResponseMessage, string urlPart)
    {
        PlatformSettings platformSettings = new PlatformSettings
        {
            ApiStorageEndpoint = "http://localhost",
            SubscriptionKey = "key",
        };
        _platformSettingsOptions.Setup(s => s.Value).Returns(platformSettings);

        AppSettings appSettings = new AppSettings { RuntimeCookieName = "AltinnStudioRuntime" };
        _appSettingsOptions.Setup(s => s.Value).Returns(appSettings);

        _contextAccessor.Setup(s => s.HttpContext).Returns(new DefaultHttpContext());

        _handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(p => p.RequestUri.ToString().Contains(urlPart)),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(httpResponseMessage)
            .Verifiable();
    }
}
