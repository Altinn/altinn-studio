using System.Net;
using System.Text;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers.Serialization;
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
using Altinn.App.Core.Tests.TestUtils;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.PlatformServices.Tests.Internal.Pdf;

public class PdfServiceTests
{
    private readonly ITestOutputHelper _outputHelper;
    private const string HostName = "at22.altinn.cloud";

    private readonly Mock<IAppResources> _appResources = new();
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

        byte[] pdf = await pdfGeneratorClient.GeneratePdf(
            new Uri(@"https://org.apps.hostName/appId/instance/instanceId"),
            CancellationToken.None
        );

        pdf.Length.Should().Be(17814);
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

    // GeneratePdf owns the HTTP response and reads the PDF out of it before returning, so the caller gets
    // bytes and has nothing to dispose. These two tests pin that the response is released on both paths:
    // once the PDF has been read, and when generation fails.

    [Fact]
    public async Task GeneratePdf_returns_the_response_content_and_disposes_the_response()
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

        byte[] pdf = await pdfGeneratorClient.GeneratePdf(
            new Uri(@"https://org.apps.hostName/appId/instance/instanceId"),
            CancellationToken.None
        );

        Assert.Equal("a pdf, honest", Encoding.UTF8.GetString(pdf));
        Assert.NotNull(content);
        Assert.True(content.IsDisposed, "GeneratePdf has read the PDF out of the response, so it releases it");
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
        Assert.True(content.IsDisposed, "GeneratePdf owns the response, so it releases it when it throws");

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

        await pdfGeneratorClient.GeneratePdf(
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
            .ReturnsAsync(Array.Empty<byte>());
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

        // Act
        await target.GeneratePdf(instance, "Task_1", cancellationToken: CancellationToken.None);

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
            .ReturnsAsync(Array.Empty<byte>());
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

        // Act
        await target.GeneratePdf(
            instance,
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
            .ReturnsAsync(Array.Empty<byte>());
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
        await target.GenerateSubformPdf(
            instance,
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

    [Fact]
    public async Task GeneratePdf_Preview_ShouldMarkTheFooterAsPreview_EvenWithoutDisplayFooter()
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
            .ReturnsAsync(Array.Empty<byte>());
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

        await target.GeneratePdf(instance, "Task_1", language: LanguageConst.En, isPreview: true);

        _pdfGeneratorClient.Verify(
            s =>
                s.GeneratePdf(
                    It.Is<Uri>(u => u.AbsoluteUri.Contains("lang=en")),
                    It.Is<string?>(footer => footer != null && footer.Contains("The document is a preview")),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
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
            .ReturnsAsync(Array.Empty<byte>());
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
        await target.GeneratePdf(instance, "Task_1", cancellationToken: CancellationToken.None);

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
            .ReturnsAsync(Array.Empty<byte>());
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
        await target.GeneratePdf(instance, "Task_1", cancellationToken: CancellationToken.None);

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
            .ReturnsAsync(Array.Empty<byte>());
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
        await target.GeneratePdf(instance, "Task_1", cancellationToken: CancellationToken.None);

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
            .ReturnsAsync(Array.Empty<byte>());
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
        await target.GeneratePdf(instance, "Task_1", cancellationToken: CancellationToken.None);

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
            .ReturnsAsync(Array.Empty<byte>());
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
        await target.GeneratePdf(instance, "Task_1", cancellationToken: CancellationToken.None);

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
        Mock<IPdfGeneratorClient>? pdfGeneratorClient = null,
        IOptions<PdfGeneratorSettings>? pdfGeneratorSettingsOptions = null,
        IOptions<GeneralSettings>? generalSettingsOptions = null,
        Mock<IAuthenticationContext>? authenticationContext = null,
        TelemetrySink? telemetrySink = null
    )
    {
        return new PdfService(
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
            CreateInstanceDataUnitOfWorkInitializer(appResources?.Object ?? _appResources.Object),
            telemetrySink?.Object
        );
    }

    private static InstanceDataUnitOfWorkInitializer CreateInstanceDataUnitOfWorkInitializer(IAppResources appResources)
    {
        var appMetadata = new Mock<IAppMetadata>();
        appMetadata.Setup(a => a.ApplicationMetadata).Returns(new ApplicationMetadata("digdir/not-really-an-app"));
        return new InstanceDataUnitOfWorkInitializer(
            Mock.Of<IDataClientWithStorageMetadata>(),
            Mock.Of<IInstanceMutationClient>(),
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            appMetadata.Object,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            appResources,
            Options.Create(new FrontEndSettings())
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
