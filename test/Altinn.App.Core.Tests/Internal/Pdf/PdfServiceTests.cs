using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Infrastructure.Clients.Pdf;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Moq;

namespace Altinn.App.PlatformServices.Tests.Internal.Pdf;

public class PdfServiceTests
{
    private const string HostName = "at22.altinn.cloud";

    private readonly Mock<IAppResources> _appResources = new();
    private readonly Mock<IDataClient> _dataClient = new();
    private readonly Mock<IHttpContextAccessor> _httpContextAccessor = new();
    private readonly Mock<IPdfGeneratorClient> _pdfGeneratorClient = new();
    private readonly IOptions<PdfGeneratorSettings> _pdfGeneratorSettingsOptions = Options.Create<PdfGeneratorSettings>(
        new() { }
    );

    private readonly IOptions<GeneralSettings> _generalSettingsOptions = Options.Create<GeneralSettings>(
        new() { HostName = HostName }
    );

    private readonly IOptions<PlatformSettings> _platformSettingsOptions = Options.Create<PlatformSettings>(new() { });

    private readonly Mock<IUserTokenProvider> _userTokenProvider;

    private readonly Mock<IAuthenticationContext> _authenticationContext = new();

    private readonly Mock<ILogger<PdfService>> _logger = new();

    public PdfServiceTests()
    {
        var resource = new TextResource()
        {
            Id = "digdir-not-really-an-app-nb",
            Language = LanguageConst.Nb,
            Org = "digdir",
            Resources = [],
        };
        _appResources
            .Setup(s => s.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(resource);

        DefaultHttpContext httpContext = new();
        httpContext.Request.Protocol = "https";
        httpContext.Request.Host = new(HostName);
        _httpContextAccessor.Setup(s => s.HttpContext!).Returns(httpContext);

        _userTokenProvider = new Mock<IUserTokenProvider>();
        _userTokenProvider.Setup(s => s.GetUserToken()).Returns("usertoken");

        _authenticationContext.Setup(s => s.Current).Returns(TestAuthentication.GetUserAuthentication());
    }

    [Fact]
    public async Task ValidRequest_ShouldReturnPdf()
    {
        using var stream = File.Open(
            Path.Join(PathUtils.GetCoreTestsPath(), "Internal", "Pdf", "TestData", "example.pdf"),
            FileMode.Open
        );
        DelegatingHandlerStub delegatingHandler = new(
            async (HttpRequestMessage request, CancellationToken token) =>
            {
                await Task.CompletedTask;
                return new HttpResponseMessage() { Content = new StreamContent(stream) };
            }
        );

        var httpClient = new HttpClient(delegatingHandler);
        var logger = new Mock<ILogger<PdfGeneratorClient>>();
        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            _userTokenProvider.Object,
            _httpContextAccessor.Object
        );

        Stream pdf = await pdfGeneratorClient.GeneratePdf(
            new Uri(@"https://org.apps.hostName/appId/#/instance/instanceId"),
            CancellationToken.None
        );

        pdf.Length.Should().Be(17814L);
    }

    [Fact]
    public async Task ValidRequest_PdfGenerationFails_ShouldThrowException()
    {
        DelegatingHandlerStub delegatingHandler = new(
            async (HttpRequestMessage request, CancellationToken token) =>
            {
                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.RequestTimeout };
            }
        );

        var httpClient = new HttpClient(delegatingHandler);
        var logger = new Mock<ILogger<PdfGeneratorClient>>();
        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            _userTokenProvider.Object,
            _httpContextAccessor.Object
        );

        var func = async () =>
            await pdfGeneratorClient.GeneratePdf(
                new Uri(@"https://org.apps.hostName/appId/#/instance/instanceId"),
                CancellationToken.None
            );

        await func.Should().ThrowAsync<PdfGenerationException>();
    }

    [Fact]
    public async Task GenerateAndStorePdf()
    {
        // Arrange
        TelemetrySink telemetrySink = new();
        _pdfGeneratorClient.Setup(s =>
            s.GeneratePdf(It.IsAny<Uri>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())
        );
        _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";

        var target = SetupPdfService(
            pdfGeneratorClient: _pdfGeneratorClient,
            generalSettingsOptions: _generalSettingsOptions,
            telemetrySink: telemetrySink
        );

        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
        };

        // Act
        await target.GenerateAndStorePdf(instance, "Task_1", CancellationToken.None);

        // Asserts
        _pdfGeneratorClient.Verify(
            s =>
                s.GeneratePdf(
                    It.Is<Uri>(u =>
                        u.Scheme == "https"
                        && u.Host == $"{instance.Org}.apps.{HostName}"
                        && u.AbsoluteUri.Contains(instance.AppId)
                        && u.AbsoluteUri.Contains(instance.Id)
                    ),
                    It.Is<string?>(s => s == null),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        _dataClient.Verify(
            s =>
                s.InsertBinaryData(
                    It.Is<string>(s => s == instance.Id),
                    It.Is<string>(s => s == "ref-data-as-pdf"),
                    It.Is<string>(s => s == "application/pdf"),
                    It.Is<string>(s => s == "not-really-an-app.pdf"),
                    It.IsAny<Stream>(),
                    It.Is<string>(s => s == "Task_1"),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        await Verify(telemetrySink.GetSnapshot());
    }

    [Fact]
    public async Task GenerateAndStorePdf_with_generatedFrom()
    {
        // Arrange
        _pdfGeneratorClient.Setup(s =>
            s.GeneratePdf(It.IsAny<Uri>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())
        );

        _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";

        var target = SetupPdfService(
            pdfGeneratorClient: _pdfGeneratorClient,
            generalSettingsOptions: _generalSettingsOptions
        );

        var dataModelId = Guid.NewGuid();
        var attachmentId = Guid.NewGuid();

        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
            Data = new()
            {
                new() { Id = dataModelId.ToString(), DataType = "Model" },
                new() { Id = attachmentId.ToString(), DataType = "attachment" },
            },
        };

        // Act
        await target.GenerateAndStorePdf(instance, "Task_1", CancellationToken.None);

        // Asserts
        _pdfGeneratorClient.Verify(
            s =>
                s.GeneratePdf(
                    It.Is<Uri>(u =>
                        u.Scheme == "https"
                        && u.Host == $"{instance.Org}.apps.{HostName}"
                        && u.AbsoluteUri.Contains(instance.AppId)
                        && u.AbsoluteUri.Contains(instance.Id)
                    ),
                    It.Is<string?>(s => s == null),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        _dataClient.Verify(
            s =>
                s.InsertBinaryData(
                    It.Is<string>(s => s == instance.Id),
                    It.Is<string>(s => s == "ref-data-as-pdf"),
                    It.Is<string>(s => s == "application/pdf"),
                    It.Is<string>(s => s == "not-really-an-app.pdf"),
                    It.IsAny<Stream>(),
                    It.Is<string>(s => s == "Task_1"),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public void GetOverridenLanguage_ShouldReturnLanguageFromQuery()
    {
        // Arrange
        var queries = new QueryCollection(new Dictionary<string, StringValues> { { "lang", LanguageConst.Nb } });

        // Act
        var language = PdfService.GetOverriddenLanguage(queries);

        // Assert
        language.Should().Be(LanguageConst.Nb);
    }

    [Fact]
    public void GetOverridenLanguage_HttpContextIsNull_ShouldReturnNull()
    {
        // Arrange
        QueryCollection? queries = null;

        // Act
        var language = PdfService.GetOverriddenLanguage(queries);

        // Assert
        language.Should().BeNull();
    }

    [Fact]
    public void GetOverridenLanguage_NoLanguageInQuery_ShouldReturnNull()
    {
        // Arrange
        IQueryCollection queries = new QueryCollection();

        // Act
        var language = PdfService.GetOverriddenLanguage(queries);

        // Assert
        language.Should().BeNull();
    }

    private PdfService SetupPdfService(
        Mock<IAppResources>? appResources = null,
        Mock<IDataClient>? dataClient = null,
        Mock<IHttpContextAccessor>? httpContentAccessor = null,
        Mock<IProfileClient>? profile = null,
        Mock<IPdfGeneratorClient>? pdfGeneratorClient = null,
        IOptions<PdfGeneratorSettings>? pdfGeneratorSettingsOptions = null,
        IOptions<GeneralSettings>? generalSettingsOptions = null,
        Mock<IAuthenticationContext>? authenticationContext = null,
        TelemetrySink? telemetrySink = null
    )
    {
        return new PdfService(
            appResources?.Object ?? _appResources.Object,
            dataClient?.Object ?? _dataClient.Object,
            httpContentAccessor?.Object ?? _httpContextAccessor.Object,
            pdfGeneratorClient?.Object ?? _pdfGeneratorClient.Object,
            pdfGeneratorSettingsOptions ?? _pdfGeneratorSettingsOptions,
            generalSettingsOptions ?? _generalSettingsOptions,
            _logger.Object,
            authenticationContext?.Object ?? _authenticationContext.Object,
            telemetrySink?.Object
        );
    }
}
