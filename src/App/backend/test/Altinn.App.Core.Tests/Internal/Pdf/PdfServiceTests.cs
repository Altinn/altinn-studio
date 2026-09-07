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
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
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
    public async Task GenerateAndStorePdf()
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

        var mutatorMock = CreateMutatorMock(instance);

        // Act
        await target.GenerateAndStorePdf(mutatorMock.Object, ct: CancellationToken.None);

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

        mutatorMock.Verify(
            m =>
                m.AddBinaryDataElement(
                    It.Is<string>(s => s == "ref-data-as-pdf"),
                    It.Is<string>(s => s == "application/pdf"),
                    It.Is<string>(s => s == "not-really-an-app.pdf"),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.Is<string?>(s => s == "Task_1"),
                    It.IsAny<List<Altinn.Platform.Storage.Interface.Models.KeyValueEntry>?>()
                ),
            Times.Once
        );

        await Verify(telemetrySink.GetSnapshot());
    }

    [Fact]
    public async Task GenerateAndStorePdf_with_generatedFrom()
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

        var mutatorMock = CreateMutatorMock(instance);

        // Act
        await target.GenerateAndStorePdf(mutatorMock.Object, ct: CancellationToken.None);

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

        mutatorMock.Verify(
            m =>
                m.AddBinaryDataElement(
                    It.Is<string>(s => s == "ref-data-as-pdf"),
                    It.Is<string>(s => s == "application/pdf"),
                    It.IsAny<string>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.Is<string?>(s => s == "Task_1"),
                    It.IsAny<List<Altinn.Platform.Storage.Interface.Models.KeyValueEntry>?>()
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

    [Fact]
    public async Task GenerateAndStorePdf_WithAutoGeneratePdfForTaskIds_ShouldIncludeTaskIdsInUri()
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

        var mutatorMock = CreateMutatorMock(instance);

        // Act
        await target.GenerateAndStorePdf(
            mutatorMock.Object,
            null,
            autoGeneratePdfForTaskIds,
            ct: CancellationToken.None
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
    public async Task GenerateAndStorePdf_WithCustomFileNameTextResourceKey_ShouldUseCustomFileName()
    {
        // Arrange
        const string customTextResourceKey = "custom.pdf.filename";
        const string customFileName = "My Custom Receipt";

        var mockAppResources = new Mock<IAppResources>();
        var resource = new TextResource()
        {
            Id = "digdir-not-really-an-app-nb",
            Language = LanguageConst.Nb,
            Org = "digdir",
            Resources = [new() { Id = customTextResourceKey, Value = customFileName }],
        };
        mockAppResources
            .Setup(s => s.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(resource);

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
            appResources: mockAppResources,
            pdfGeneratorClient: _pdfGeneratorClient,
            generalSettingsOptions: _generalSettingsOptions
        );

        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
            Data = new()
            {
                new() { Id = Guid.NewGuid().ToString(), DataType = "Model" },
            },
        };

        var mutatorMock = CreateMutatorMock(instance, mockAppResources);

        // Act
        await target.GenerateAndStorePdf(mutatorMock.Object, customTextResourceKey, null, ct: CancellationToken.None);

        // Assert
        mutatorMock.Verify(
            m =>
                m.AddBinaryDataElement(
                    It.Is<string>(s => s == "ref-data-as-pdf"),
                    It.Is<string>(s => s == "application/pdf"),
                    It.Is<string>(s => s == "My%20Custom%20Receipt.pdf"),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.Is<string?>(s => s == "Task_1"),
                    It.IsAny<List<Altinn.Platform.Storage.Interface.Models.KeyValueEntry>?>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GenerateAndStorePdf_WithCustomFileNameIncludingPdfExtension_ShouldNotDuplicateExtension()
    {
        // Arrange
        const string customTextResourceKey = "custom.pdf.filename.with.extension";
        const string customFileName = "My Custom Receipt.pdf";

        var mockAppResources = new Mock<IAppResources>();
        var resource = new TextResource()
        {
            Id = "digdir-not-really-an-app-nb",
            Language = LanguageConst.Nb,
            Org = "digdir",
            Resources = [new() { Id = customTextResourceKey, Value = customFileName }],
        };
        mockAppResources
            .Setup(s => s.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(resource);

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
            appResources: mockAppResources,
            pdfGeneratorClient: _pdfGeneratorClient,
            generalSettingsOptions: _generalSettingsOptions
        );

        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
            Data = new()
            {
                new() { Id = Guid.NewGuid().ToString(), DataType = "Model" },
            },
        };

        var mutatorMock = CreateMutatorMock(instance, mockAppResources);

        // Act
        await target.GenerateAndStorePdf(mutatorMock.Object, customTextResourceKey, null, ct: CancellationToken.None);

        // Assert
        mutatorMock.Verify(
            m =>
                m.AddBinaryDataElement(
                    It.Is<string>(s => s == "ref-data-as-pdf"),
                    It.Is<string>(s => s == "application/pdf"),
                    It.Is<string>(s => s == "My%20Custom%20Receipt.pdf"),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.Is<string?>(s => s == "Task_1"),
                    It.IsAny<List<Altinn.Platform.Storage.Interface.Models.KeyValueEntry>?>()
                ),
            Times.Once
        );
    }

    private static Mock<IInstanceDataMutator> CreateMutatorMock(
        Instance instance,
        Mock<IAppResources>? appResources = null
    )
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(m => m.Instance).Returns(instance);

        var pdfDataType = new DataType { Id = "ref-data-as-pdf" };
        var modelDataType = new DataType { Id = "Model" };
        mutatorMock.Setup(m => m.DataTypes).Returns(new List<DataType> { pdfDataType, modelDataType });

        mutatorMock
            .Setup(m =>
                m.AddBinaryDataElement(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.IsAny<string?>(),
                    It.IsAny<List<Altinn.Platform.Storage.Interface.Models.KeyValueEntry>?>()
                )
            )
            .Returns(
                (
                    string dataTypeId,
                    string contentType,
                    string? filename,
                    ReadOnlyMemory<byte> bytes,
                    string? generatedFromTask,
                    List<Altinn.Platform.Storage.Interface.Models.KeyValueEntry>? metadata
                ) =>
                    new BinaryDataChange(
                        ChangeType.Created,
                        pdfDataType,
                        contentType,
                        null,
                        filename,
                        bytes,
                        generatedFromTask,
                        metadata
                    )
            );

        // Setup LayoutEvaluatorState for variable substitution
        if (appResources != null)
        {
            var uiFolderComponent = new UiFolderComponent(new List<PageComponent>(), "layout", modelDataType);
            var layoutModel = new LayoutModel([uiFolderComponent], null);
            appResources.Setup(x => x.GetLayoutModelForFolder(It.IsAny<string>())).Returns(layoutModel);

            var layoutEvaluatorState = new LayoutEvaluatorState(
                mutatorMock.Object,
                layoutModel,
                Mock.Of<ITranslationService>(),
                new FrontEndSettings(),
                gatewayAction: null,
                language: null
            );
            mutatorMock.Setup(m => m.GetLayoutEvaluatorState()).Returns(layoutEvaluatorState);
        }

        return mutatorMock;
    }

    [Fact]
    public async Task GenerateAndStorePdf_WithDisplayFooter_HideAppNameInPdfExpression_EvaluatesToTrue_FooterShouldNotContainAppName()
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
        var mutatorMock = CreateMutatorMock(instance);
        await target.GenerateAndStorePdf(mutatorMock.Object, ct: CancellationToken.None);

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
    public async Task GenerateAndStorePdf_WithDisplayFooter_HideAppNameInPdfTrue_FooterShouldNotContainAppName()
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
        var mutatorMock = CreateMutatorMock(instance);
        await target.GenerateAndStorePdf(mutatorMock.Object, ct: CancellationToken.None);

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
    public async Task GenerateAndStorePdf_WithDisplayFooter_HideAppNameInPdfFalse_FooterShouldContainAppName()
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
        var mutatorMock = CreateMutatorMock(instance);
        await target.GenerateAndStorePdf(mutatorMock.Object, ct: CancellationToken.None);

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
    public async Task GenerateAndStorePdf_WithDisplayFooter_NoUiSettings_FooterShouldContainAppName()
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
        var mutatorMock = CreateMutatorMock(instance);
        await target.GenerateAndStorePdf(mutatorMock.Object, ct: CancellationToken.None);

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
    public async Task GenerateAndStorePdf_WithDisplayFooter_MalformedLayoutSets_ShouldStillGeneratePdfWithAppName()
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
        var mutatorMock = CreateMutatorMock(instance);
        await target.GenerateAndStorePdf(mutatorMock.Object, ct: CancellationToken.None);

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
    public async Task GeneratePdf_NoMutator_HideAppNameInPdfExpression_EvaluatesToTrue_FooterShouldNotContainAppName()
    {
        // Arrange: the non-mutator GeneratePdf(Instance, taskId, ...) path (preview/signing/payment) has no
        // data accessor in scope, so a non-literal expression must fall back to InstanceDataUnitOfWorkInitializer.Init.
        // This test fails if that initializer is ever removed from PdfService.
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
        await target.GeneratePdf(instance, "Task_1", isPreview: false, ct: CancellationToken.None);

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
    public async Task GeneratePreviewPdf_WithPathTaskIdAndAutoPdfTaskIds_ShouldIncludeBothInUri()
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
            generalSettingsOptions: _generalSettingsOptions
        );

        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
        };

        var previewTarget = new PdfPreviewTarget("Task_Pdf", "Task_Pdf", ["Task_1"], null);

        // Act
        await ((IPdfService)target).GeneratePreviewPdf(instance, previewTarget, CancellationToken.None);

        // Assert
        _pdfGeneratorClient.Verify(
            s =>
                s.GeneratePdf(
                    It.Is<Uri>(u =>
                        u.AbsoluteUri.Contains("/Task_Pdf?pdf=1")
                        && u.AbsoluteUri.Contains("task=Task_1")
                        && u.AbsoluteUri.Contains("lang=")
                    ),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GeneratePreviewPdf_WithoutPathTaskId_ShouldNotAddTaskPathSegmentToUri()
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
            generalSettingsOptions: _generalSettingsOptions
        );

        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
        };

        var previewTarget = new PdfPreviewTarget("Task_1", null, null, null);

        // Act
        await ((IPdfService)target).GeneratePreviewPdf(instance, previewTarget, CancellationToken.None);

        // Assert: the URL is the plain "current task" preview URL, with no task path segment appended.
        _pdfGeneratorClient.Verify(
            s =>
                s.GeneratePdf(
                    It.Is<Uri>(u => u.AbsoluteUri.Contains($"{instance.Id}?pdf=1")),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    private void SetupSubformResources(string uiFolder = "mySubform")
    {
        _appResources
            .Setup(x => x.GetUiConfiguration())
            .Returns(
                new UiConfiguration
                {
                    Folders = new()
                    {
                        ["Task_1"] = new(),
                        ["Task_2"] = new(),
                        [uiFolder] = new() { DefaultDataType = "Sub" },
                        ["OtherSubform"] = new() { DefaultDataType = "Other" },
                    },
                }
            );
        _appResources.Setup(x => x.GetLayoutsInFolder(It.IsAny<string>())).Returns("{}");
        _appResources.Setup(x => x.GetLayoutsInFolder("Task_1")).Returns(SubformLayouts(uiFolder));
        _appResources.Setup(x => x.GetLayoutsInFolder("Task_2")).Returns(SubformLayouts("OtherSubform"));
    }

    private static string SubformLayouts(string uiFolder) =>
        System.Text.Json.JsonSerializer.Serialize(
            new
            {
                Page = new
                {
                    data = new
                    {
                        layout = new[]
                        {
                            new
                            {
                                id = "subform-x",
                                type = "Subform",
                                layoutSet = uiFolder,
                            },
                        },
                    },
                },
            }
        );

    private static Instance SubformInstance(params string[] dataElementIds) =>
        new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_SubformPdf" } },
            Data = dataElementIds.Select(id => new DataElement { Id = id, DataType = "Sub" }).ToList(),
        };

    [Theory]
    [InlineData("mySubform")]
    [InlineData("Subform & details")]
    public async Task GenerateSubformPdf_PreviewAndStoredGenerationUseSameResolvedRenderContext(string uiFolder)
    {
        SetupSubformResources(uiFolder);
        List<Uri> urls = [];
        _pdfGeneratorClient
            .Setup(x =>
                x.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Uri, string?, StorageAuthenticationMethod?, CancellationToken>((uri, _, _, _) => urls.Add(uri))
            .ReturnsAsync(() => new MemoryStream());
        _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";
        var service = SetupPdfService();
        string dataElementId = Guid.NewGuid().ToString();
        Instance instance = SubformInstance(dataElementId);
        instance.Process.CurrentTask.ElementId = "Task_1";
        var serviceTask = new ServiceTask
        {
            Id = "Task_SubformPdf",
            ExtensionElements = new()
            {
                TaskExtension = new()
                {
                    TaskType = "subformPdf",
                    SubformPdfConfiguration = new() { SubformComponentId = "subform-x", SubformDataTypeId = "Sub" },
                },
            },
        };
        var processReader = new Mock<IProcessReader>();
        processReader.Setup(x => x.GetFlowElement(serviceTask.Id)).Returns(serviceTask);
        processReader
            .Setup(x => x.GetAltinnTaskExtension(serviceTask.Id))
            .Returns(serviceTask.ExtensionElements.TaskExtension);
        var resolver = new PdfPreviewTaskResolver(processReader.Object, _appResources.Object);
        PdfPreviewTarget preview = resolver.Resolve(instance, serviceTask.Id, dataElementId);

        using Stream previewStream = await ((IPdfService)service).GeneratePreviewPdf(
            instance,
            preview,
            CancellationToken.None
        );
        instance.Process.CurrentTask.ElementId = serviceTask.Id;
        await service.GenerateAndStoreSubformPdf(
            CreateMutatorMock(instance).Object,
            null,
            new SubformPdfContext("subform-x", dataElementId)
        );

        Assert.Equal(2, urls.Count);
        Assert.Equal(urls[0], urls[1]);
        Assert.EndsWith($"/{instance.Id}/{serviceTask.Id}", urls[0].AbsolutePath);
        var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(urls[0].Query);
        Assert.Equal("1", query["pdf"].ToString());
        Assert.Equal(uiFolder, query["pdfUiFolder"].ToString());
        Assert.Equal(dataElementId, query["pdfDataElementId"].ToString());
    }

    [Fact]
    public async Task GenerateAndStoreSubformPdf_MultipleElements_LoadsLayoutsOnce()
    {
        SetupSubformResources();
        _pdfGeneratorClient
            .Setup(x =>
                x.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => new MemoryStream());
        _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";
        var service = SetupPdfService();
        Instance instance = SubformInstance(Guid.NewGuid().ToString(), Guid.NewGuid().ToString());
        var mutator = CreateMutatorMock(instance);

        foreach (DataElement element in instance.Data)
        {
            await service.GenerateAndStoreSubformPdf(
                mutator.Object,
                null,
                new SubformPdfContext("subform-x", element.Id)
            );
            _pdfGeneratorClient.Verify(
                x =>
                    x.GeneratePdf(
                        It.Is<Uri>(uri => uri.Query.Contains($"pdfDataElementId={element.Id}")),
                        It.IsAny<string?>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        _appResources.Verify(x => x.GetUiConfiguration(), Times.Once);
        foreach (string folder in new[] { "Task_1", "Task_2", "mySubform", "OtherSubform" })
        {
            _appResources.Verify(x => x.GetLayoutsInFolder(folder), Times.Once);
        }
    }

    [Fact]
    public async Task GeneratePreviewPdf_ResolvedSubform_DoesNotDiscoverLayouts()
    {
        _pdfGeneratorClient
            .Setup(x =>
                x.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => new MemoryStream());
        _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";
        var service = SetupPdfService();
        string dataElementId = Guid.NewGuid().ToString();
        Instance instance = SubformInstance(dataElementId);
        var preview = new PdfPreviewTarget(
            "Task_SubformPdf",
            "Task_SubformPdf",
            null,
            new SubformPdfRenderTarget("mySubform", "Sub", dataElementId)
        );

        using Stream stream = await ((IPdfService)service).GeneratePreviewPdf(
            instance,
            preview,
            CancellationToken.None
        );

        _appResources.Verify(x => x.GetUiConfiguration(), Times.Never);
        _appResources.Verify(x => x.GetLayoutsInFolder(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GenerateAndStoreSubformPdf_ComponentNotFound_RejectsBeforeGeneration()
    {
        SetupSubformResources();
        string dataElementId = Guid.NewGuid().ToString();
        Instance instance = SubformInstance(dataElementId);
        var service = SetupPdfService();

        await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            service.GenerateAndStoreSubformPdf(
                CreateMutatorMock(instance).Object,
                null,
                new SubformPdfContext("missing-component", dataElementId)
            )
        );

        _pdfGeneratorClient.Verify(
            x =>
                x.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
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
        // Setup a mock service provider with InstanceDataUnitOfWorkInitializer (used by hideAppNameInPdf evaluation)
        var mockServiceProvider = new Mock<IServiceProvider>();
        var mockDataClient = new Mock<IDataClient>();
        var mockInstanceClient = new Mock<IInstanceClient>();
        var mockAppMetadata = new Mock<IAppMetadata>();

        var dataType = new DataType() { Id = "Model" };
        var applicationMetadata = new ApplicationMetadata("digdir/not-really-an-app") { DataTypes = [dataType] };
        mockAppMetadata.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        var uiFolderComponent = new UiFolderComponent(new List<PageComponent>(), "layout", dataType);
        var layoutModel = new LayoutModel([uiFolderComponent], null);
        var appResourcesForInitializer = appResources ?? _appResources;
        appResourcesForInitializer.Setup(x => x.GetLayoutModelForFolder(It.IsAny<string>())).Returns(layoutModel);

        var initializer = new InstanceDataUnitOfWorkInitializer(
            mockDataClient.Object,
            mockInstanceClient.Object,
            mockAppMetadata.Object,
            new TranslationService(
                new AppIdentifier("digdir", "not-really-an-app"),
                appResources?.Object ?? _appResources.Object,
                FakeLoggerXunit.Get<TranslationService>(_outputHelper)
            ),
            null!, // ModelSerializationService not needed for these tests
            appResources?.Object ?? _appResources.Object,
            Options.Create(new FrontEndSettings()),
            null
        );

        mockServiceProvider.Setup(x => x.GetService(typeof(InstanceDataUnitOfWorkInitializer))).Returns(initializer);

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
            mockServiceProvider.Object,
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
