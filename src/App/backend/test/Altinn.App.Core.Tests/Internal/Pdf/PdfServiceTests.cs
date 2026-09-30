using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Infrastructure.Clients.Pdf;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.PlatformServices.Tests.Internal.Pdf;

public class PdfServiceTests
{
    private readonly ITestOutputHelper _outputHelper;
    private const string HostName = "at22.altinn.cloud";

    private readonly Mock<IAppResources> _appResources = new();
    private readonly Mock<IHttpContextAccessor> _httpContextAccessor = new();
    private readonly Mock<IPdfGeneratorClient> _pdfGeneratorClient = new();
    private readonly IOptions<PdfGeneratorSettings> _pdfGeneratorSettingsOptions = Options.Create<PdfGeneratorSettings>(
        new() { }
    );

    private readonly IOptions<GeneralSettings> _generalSettingsOptions = Options.Create<GeneralSettings>(
        new() { HostName = HostName }
    );

    private readonly IOptions<PlatformSettings> _platformSettingsOptions = Options.Create<PlatformSettings>(new() { });

    private readonly Mock<IAuthenticationContext> _authenticationContext = new();

    public PdfServiceTests(ITestOutputHelper outputHelper)
    {
        _outputHelper = outputHelper;
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
        var authenticationTokenResolver = CreateAuthenticationTokenResolver(TestAuthentication.GetUserToken());
        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            authenticationTokenResolver.Object
        );

        Stream pdf = await pdfGeneratorClient.GeneratePdf(
            new Uri(@"https://org.apps.hostName/appId/instance/instanceId"),
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
        var authenticationTokenResolver = CreateAuthenticationTokenResolver(TestAuthentication.GetUserToken());
        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            authenticationTokenResolver.Object
        );

        var func = async () =>
            await pdfGeneratorClient.GeneratePdf(
                new Uri(@"https://org.apps.hostName/appId/instance/instanceId"),
                CancellationToken.None
            );

        await func.Should().ThrowAsync<PdfGenerationException>();
    }

    // The stream GeneratePdf returns owns the HTTP response behind it. These two tests pin both halves of
    // that contract: the response survives until the caller disposes the stream, and it is not leaked when
    // generation fails and no stream is returned at all.

    [Fact]
    public async Task GeneratePdf_stream_is_readable_after_the_call_returned_and_owns_the_response()
    {
        DisposeTrackingContent? content = null;
        DelegatingHandlerStub delegatingHandler = new(
            async (HttpRequestMessage request, CancellationToken token) =>
            {
                await Task.CompletedTask;
                var (response, trackedContent) = DisposeTrackingContent.Response("a pdf, honest");
                content = trackedContent;
                return response;
            }
        );

        var httpClient = new HttpClient(delegatingHandler);
        var logger = new Mock<ILogger<PdfGeneratorClient>>();
        var authenticationTokenResolver = CreateAuthenticationTokenResolver(TestAuthentication.GetUserToken());
        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            authenticationTokenResolver.Object
        );

        // Deliberately read after GeneratePdf has returned: this is the case a `using` on the response
        // inside GeneratePdf would break, and it would break here rather than there.
        Stream pdf = await pdfGeneratorClient.GeneratePdf(
            new Uri(@"https://org.apps.hostName/appId/instance/instanceId"),
            CancellationToken.None
        );

        Assert.NotNull(content);
        Assert.False(content.IsDisposed, "the caller has not disposed the stream yet");

        using (StreamReader reader = new(pdf, leaveOpen: true))
        {
            var read = await reader.ReadToEndAsync();
            Assert.Equal("a pdf, honest", read);
        }

        await pdf.DisposeAsync();
        Assert.True(content.IsDisposed, "the returned stream owns the response");
    }

    [Fact]
    public async Task GeneratePdf_disposes_the_response_when_generation_fails()
    {
        DisposeTrackingContent? content = null;
        DelegatingHandlerStub delegatingHandler = new(
            async (HttpRequestMessage request, CancellationToken token) =>
            {
                await Task.CompletedTask;
                var (response, trackedContent) = DisposeTrackingContent.Response(
                    "pdf generator exploded",
                    HttpStatusCode.RequestTimeout
                );
                content = trackedContent;
                return response;
            }
        );

        var httpClient = new HttpClient(delegatingHandler);
        var logger = new Mock<ILogger<PdfGeneratorClient>>();
        var authenticationTokenResolver = CreateAuthenticationTokenResolver(TestAuthentication.GetUserToken());
        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            authenticationTokenResolver.Object
        );

        var thrown = await Assert.ThrowsAsync<PdfGenerationException>(async () =>
            await pdfGeneratorClient.GeneratePdf(
                new Uri(@"https://org.apps.hostName/appId/instance/instanceId"),
                CancellationToken.None
            )
        );

        Assert.NotNull(content);
        Assert.True(content.IsDisposed, "no stream is returned, so nothing else can release the response");

        // The diagnostic content is copied onto the exception, so disposing the response does not empty it.
        Assert.Equal("pdf generator exploded", thrown.Data["responseContent"]);
        Assert.Equal(nameof(HttpStatusCode.RequestTimeout), thrown.Data["responseStatusCode"]);
    }

    [Fact]
    public async Task GeneratePdf_WithServiceOwnerAuthentication_UsesServiceOwnerToken()
    {
        string serviceOwnerToken = TestAuthentication.GetServiceOwnerToken();
        var authTokenResolver = new Mock<IAuthenticationTokenResolver>(MockBehavior.Strict);
        authTokenResolver
            .Setup(r =>
                r.GetAccessToken(
                    It.Is<AuthenticationMethod>(auth => auth == StorageAuthenticationMethod.ServiceOwner()),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(JwtToken.Parse(serviceOwnerToken));

        string? requestBody = null;
        DelegatingHandlerStub delegatingHandler = new(
            async (HttpRequestMessage request, CancellationToken token) =>
            {
                requestBody = await request.Content!.ReadAsStringAsync(token);
                return new HttpResponseMessage { StatusCode = HttpStatusCode.OK, Content = new StringContent("PDF") };
            }
        );

        var httpClient = new HttpClient(delegatingHandler);
        var logger = new Mock<ILogger<PdfGeneratorClient>>();
        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            authTokenResolver.Object
        );

        using Stream pdf = await pdfGeneratorClient.GeneratePdf(
            new Uri(@"https://org.apps.hostName/appId/instance/instanceId"),
            null,
            StorageAuthenticationMethod.ServiceOwner(),
            CancellationToken.None
        );

        requestBody.Should().Contain(serviceOwnerToken);
        authTokenResolver.Verify(
            r =>
                r.GetAccessToken(
                    It.Is<AuthenticationMethod>(auth => auth == StorageAuthenticationMethod.ServiceOwner()),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GeneratePdf()
    {
        // Arrange
        TelemetrySink telemetrySink = new();
        _pdfGeneratorClient
            .Setup(s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream());
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
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
        };

        var dataAccessorMock = CreateDataAccessorMock(instance);

        // Act
        await target.GeneratePdf(dataAccessorMock.Object, "Task_1", cancellationToken: CancellationToken.None);

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
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        await Verify(telemetrySink.GetSnapshot());
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

    [Fact]
    public async Task GeneratePdf_WithAutoGeneratePdfForTaskIds_ShouldIncludeTaskIdsInUri()
    {
        // Arrange
        var autoGeneratePdfForTaskIds = new List<string> { "Task_1", "Task_2", "Task_3" };

        _pdfGeneratorClient
            .Setup(s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream());
        _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";

        var target = SetupPdfService(
            pdfGeneratorClient: _pdfGeneratorClient,
            generalSettingsOptions: _generalSettingsOptions
        );

        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_PDF" } },
        };

        var dataAccessorMock = CreateDataAccessorMock(instance);

        // Act
        await target.GeneratePdf(
            dataAccessorMock.Object,
            "Task_PDF",
            autoGeneratePdfForTaskIds,
            cancellationToken: CancellationToken.None
        );

        // Assert
        _pdfGeneratorClient.Verify(
            s =>
                s.GeneratePdf(
                    It.Is<Uri>(u =>
                        u.Scheme == "https"
                        && u.Host == $"{instance.Org}.apps.{HostName}"
                        && u.AbsoluteUri.Contains(instance.AppId)
                        && u.AbsoluteUri.Contains(instance.Id)
                        && u.AbsoluteUri.Contains("task=Task_1")
                        && u.AbsoluteUri.Contains("task=Task_2")
                        && u.AbsoluteUri.Contains("task=Task_3")
                    ),
                    It.Is<string?>(s => s == null),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GenerateSubformPdf_ShouldRenderTheSubform()
    {
        _pdfGeneratorClient
            .Setup(s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream());
        _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";
        var target = SetupPdfService(
            pdfGeneratorClient: _pdfGeneratorClient,
            generalSettingsOptions: _generalSettingsOptions
        );
        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
        };
        var dataAccessorMock = CreateDataAccessorMock(instance);

        await target.GenerateSubformPdf(
            dataAccessorMock.Object,
            "Task_1",
            new SubformPdfContext("subform-component", "subform-data-element")
        );

        _pdfGeneratorClient.Verify(
            s =>
                s.GeneratePdf(
                    It.Is<Uri>(u =>
                        u.AbsoluteUri.Contains(instance.Id)
                        && u.AbsoluteUri.Contains("/Task_1/subform/subform-component/subform-data-element")
                    ),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    private static Mock<IInstanceDataAccessor> CreateDataAccessorMock(Instance instance)
    {
        var dataAccessorMock = new Mock<IInstanceDataAccessor>();
        dataAccessorMock.Setup(m => m.Instance).Returns(instance);
        return dataAccessorMock;
    }

    [Fact]
    public async Task GeneratePdf_WithDisplayFooter_HideAppNameInPdfExpression_EvaluatesToTrue_FooterShouldNotContainAppName()
    {
        // Arrange
        _appResources
            .Setup(s => s.GetGlobalUiSettings())
            .Returns(
                new GlobalPageSettings
                {
                    HideAppNameInPdf = new Expression(
                        ExpressionFunction.equals,
                        new Expression((ExpressionValue)"a"),
                        new Expression((ExpressionValue)"a")
                    ),
                }
            );

        _pdfGeneratorClient
            .Setup(s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream());
        _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";

        var target = SetupPdfService(
            pdfGeneratorClient: _pdfGeneratorClient,
            generalSettingsOptions: _generalSettingsOptions,
            pdfGeneratorSettingsOptions: Options.Create(new PdfGeneratorSettings { DisplayFooter = true })
        );

        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
            Data = [],
        };

        // Act
        var dataAccessorMock = CreateDataAccessorMock(instance);
        await target.GeneratePdf(dataAccessorMock.Object, "Task_1", cancellationToken: CancellationToken.None);

        _pdfGeneratorClient.Verify(
            s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.Is<string?>(footer => footer != null && !footer.Contains("not-really-an-app")),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GeneratePdf_WithDisplayFooter_HideAppNameInPdfTrue_FooterShouldNotContainAppName()
    {
        // Arrange
        _appResources
            .Setup(s => s.GetGlobalUiSettings())
            .Returns(new GlobalPageSettings { HideAppNameInPdf = new Expression(ExpressionValue.True) });
        _pdfGeneratorClient
            .Setup(s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream());
        _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";

        var target = SetupPdfService(
            pdfGeneratorClient: _pdfGeneratorClient,
            generalSettingsOptions: _generalSettingsOptions,
            pdfGeneratorSettingsOptions: Options.Create(new PdfGeneratorSettings { DisplayFooter = true })
        );

        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
        };

        // Act
        var dataAccessorMock = CreateDataAccessorMock(instance);
        await target.GeneratePdf(dataAccessorMock.Object, "Task_1", cancellationToken: CancellationToken.None);

        // Assert
        _pdfGeneratorClient.Verify(
            s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.Is<string?>(footer => footer != null && !footer.Contains("not-really-an-app")),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GeneratePdf_WithDisplayFooter_HideAppNameInPdfFalse_FooterShouldContainAppName()
    {
        // Arrange
        _appResources
            .Setup(s => s.GetGlobalUiSettings())
            .Returns(new GlobalPageSettings { HideAppNameInPdf = new Expression(ExpressionValue.False) });
        _pdfGeneratorClient
            .Setup(s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream());
        _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";

        var target = SetupPdfService(
            pdfGeneratorClient: _pdfGeneratorClient,
            generalSettingsOptions: _generalSettingsOptions,
            pdfGeneratorSettingsOptions: Options.Create(new PdfGeneratorSettings { DisplayFooter = true })
        );

        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
        };

        // Act
        var dataAccessorMock = CreateDataAccessorMock(instance);
        await target.GeneratePdf(dataAccessorMock.Object, "Task_1", cancellationToken: CancellationToken.None);

        // Assert
        _pdfGeneratorClient.Verify(
            s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.Is<string?>(footer => footer != null && footer.Contains("not-really-an-app")),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GeneratePdf_WithDisplayFooter_NoUiSettings_FooterShouldContainAppName()
    {
        // Arrange
        _pdfGeneratorClient
            .Setup(s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream());
        _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";

        var target = SetupPdfService(
            pdfGeneratorClient: _pdfGeneratorClient,
            generalSettingsOptions: _generalSettingsOptions,
            pdfGeneratorSettingsOptions: Options.Create(new PdfGeneratorSettings { DisplayFooter = true })
        );

        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
        };

        // Act
        var dataAccessorMock = CreateDataAccessorMock(instance);
        await target.GeneratePdf(dataAccessorMock.Object, "Task_1", cancellationToken: CancellationToken.None);

        // Assert
        _pdfGeneratorClient.Verify(
            s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.Is<string?>(footer => footer != null && footer.Contains("not-really-an-app")),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GeneratePdf_WithDisplayFooter_MalformedLayoutSets_ShouldStillGeneratePdfWithAppName()
    {
        // Arrange
        _appResources.Setup(s => s.GetGlobalUiSettings()).Throws<System.Text.Json.JsonException>();
        _pdfGeneratorClient
            .Setup(s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream());
        _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";

        var target = SetupPdfService(
            pdfGeneratorClient: _pdfGeneratorClient,
            generalSettingsOptions: _generalSettingsOptions,
            pdfGeneratorSettingsOptions: Options.Create(new PdfGeneratorSettings { DisplayFooter = true })
        );

        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
        };

        // Act
        var dataAccessorMock = CreateDataAccessorMock(instance);
        await target.GeneratePdf(dataAccessorMock.Object, "Task_1", cancellationToken: CancellationToken.None);

        // Assert
        _pdfGeneratorClient.Verify(
            s =>
                s.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.Is<string?>(footer => footer != null && footer.Contains("not-really-an-app")),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    private PdfService SetupPdfService(
        Mock<IAppResources>? appResources = null,
        Mock<IHttpContextAccessor>? httpContentAccessor = null,
        Mock<IPdfGeneratorClient>? pdfGeneratorClient = null,
        IOptions<PdfGeneratorSettings>? pdfGeneratorSettingsOptions = null,
        IOptions<GeneralSettings>? generalSettingsOptions = null,
        Mock<IAuthenticationContext>? authenticationContext = null,
        TelemetrySink? telemetrySink = null
    )
    {
        return new PdfService(
            httpContentAccessor?.Object ?? _httpContextAccessor.Object,
            pdfGeneratorClient?.Object ?? _pdfGeneratorClient.Object,
            pdfGeneratorSettingsOptions ?? _pdfGeneratorSettingsOptions,
            generalSettingsOptions ?? _generalSettingsOptions,
            FakeLoggerXunit.Get<PdfService>(_outputHelper),
            authenticationContext?.Object ?? _authenticationContext.Object,
            new TranslationService(
                new AppIdentifier("digdir", "not-really-an-app"),
                appResources?.Object ?? _appResources.Object,
                FakeLoggerXunit.Get<TranslationService>(_outputHelper)
            ),
            appResources?.Object ?? _appResources.Object,
            telemetrySink?.Object
        );
    }

    private static Mock<IAuthenticationTokenResolver> CreateAuthenticationTokenResolver(string tokenValue)
    {
        var authenticationTokenResolver = new Mock<IAuthenticationTokenResolver>();
        authenticationTokenResolver
            .Setup(a => a.GetAccessToken(It.IsAny<AuthenticationMethod>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(JwtToken.Parse(tokenValue));
        return authenticationTokenResolver;
    }
}
