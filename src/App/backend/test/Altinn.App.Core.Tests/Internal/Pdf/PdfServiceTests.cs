using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Infrastructure.Clients.Pdf;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
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
        var hostEnvironment = new Mock<IHostEnvironment>();
        var authenticationTokenResolver = CreateAuthenticationTokenResolver(TestAuthentication.GetUserToken());
        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            authenticationTokenResolver.Object,
            _httpContextAccessor.Object,
            hostEnvironment.Object
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
        var hostEnvironment = new Mock<IHostEnvironment>();
        var authenticationTokenResolver = CreateAuthenticationTokenResolver(TestAuthentication.GetUserToken());
        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            authenticationTokenResolver.Object,
            _httpContextAccessor.Object,
            hostEnvironment.Object
        );

        var func = async () =>
            await pdfGeneratorClient.GeneratePdf(
                new Uri(@"https://org.apps.hostName/appId/instance/instanceId"),
                CancellationToken.None
            );

        await func.Should().ThrowAsync<PdfGenerationException>();
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
        var hostEnvironment = new Mock<IHostEnvironment>();
        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            authTokenResolver.Object,
            _httpContextAccessor.Object,
            hostEnvironment.Object
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
