using Altinn.App.Api.Controllers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Infrastructure.Clients.Pdf;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using IAppMetadata = Altinn.App.Core.Internal.App.IAppMetadata;
using IAppResources = Altinn.App.Core.Internal.App.IAppResources;

namespace Altinn.App.Api.Tests.Controllers;

public class PdfControllerTests
{
    private readonly string _org = "org";
    private readonly string _app = "app";
    private readonly Guid _instanceId = new("e11e3e0b-a45c-48fb-a968-8d4ddf868c80");
    private readonly int _partyId = 12345;
    private readonly string _taskId = "Task_1";
    private const string ModelDataElementId = "7b5a1f0e-6d8c-4a3b-9e2f-1c4d5e6f7a8b";
    private const string SubformDataElementId = "3c9e2d1f-8a7b-4c6d-9e5f-0a1b2c3d4e5f";

    private readonly Mock<IAppResources> _appResources = new();
    private readonly Mock<IDataClient> _dataClient = new();
    private readonly IOptions<PlatformSettings> _platformSettingsOptions = Options.Create<PlatformSettings>(new() { });
    private readonly Mock<IInstanceClient> _instanceClient = new();
    private readonly Mock<IPdfFormatter> _pdfFormatter = new();
    private readonly Mock<IAppModel> _appModel = new();
    private readonly Mock<IProcessReader> _processReader = new();
    private readonly Mock<IAppMetadata> _appMetadata = new();
    private readonly Mock<IInstanceClientWithStorageMetadata> _instanceClientWithStorageMetadata;
    private readonly Mock<IDataClientWithStorageMetadata> _dataClientWithStorageMetadata;
    private readonly Mock<IInstanceMutationClient> _mutationClient;

    private readonly IOptions<PdfGeneratorSettings> _pdfGeneratorSettingsOptions = Options.Create<PdfGeneratorSettings>(
        new() { }
    );

    private readonly Mock<IAuthenticationContext> _authenticationContext = new();

    private readonly Mock<ILogger<PdfService>> _logger = new();
    private readonly Mock<ITranslationService> _translationService = new();

    private Instance _instance =>
        new()
        {
            Org = _org,
            AppId = $"{_org}/{_app}",
            Id = $"{_partyId}/{_instanceId}",
            Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = _taskId } },
            Data =
            [
                new DataElement() { Id = ModelDataElementId, DataType = "model" },
                new DataElement() { Id = SubformDataElementId, DataType = "subform-model" },
            ],
        };

    public PdfControllerTests()
    {
        _instanceClientWithStorageMetadata = _instanceClient.As<IInstanceClientWithStorageMetadata>();
        _dataClientWithStorageMetadata = _dataClient.As<IDataClientWithStorageMetadata>();
        _mutationClient = _dataClient.As<IInstanceMutationClient>();
        _instanceClient
            .Setup(a =>
                a.GetInstance(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => _instance);
        _instanceClientWithStorageMetadata
            .Setup(a =>
                a.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => new InstanceWithStorageMetadata(_instance, StorageVersionMetadata.Empty));
        _appMetadata.Setup(a => a.ApplicationMetadata).Returns(new ApplicationMetadata($"{_org}/{_app}"));

        _authenticationContext.Setup(s => s.Current).Returns(TestAuthentication.GetUserAuthentication());
    }

    private PdfService NewPdfService(
        Mock<IHttpContextAccessor> httpContextAccessor,
        PdfGeneratorClient pdfGeneratorClient,
        IOptions<GeneralSettings> generalSettingsOptions
    )
    {
        var pdfService = new PdfService(
            httpContextAccessor.Object,
            pdfGeneratorClient,
            _pdfGeneratorSettingsOptions,
            generalSettingsOptions,
            _logger.Object,
            _authenticationContext.Object,
            _translationService.Object,
            _appResources.Object
        );
        return pdfService;
    }

    private PdfController NewPdfController(IPdfService pdfService)
    {
        var services = new ServiceCollection();
        services.AddTransient<ModelSerializationService>();
        services.AddTransient<InstanceDataUnitOfWorkInitializer>();
        services.AddSingleton(Options.Create(new FrontEndSettings()));
        services.AddSingleton(_instanceClientWithStorageMetadata.Object);
        services.AddSingleton(_dataClientWithStorageMetadata.Object);
        services.AddSingleton(_mutationClient.Object);
        services.AddSingleton(_appMetadata.Object);
        services.AddSingleton(_translationService.Object);
        services.AddSingleton(_appResources.Object);
        services.AddSingleton(_appModel.Object);

        return new PdfController(
            _instanceClient.Object,
            _pdfFormatter.Object,
            _appResources.Object,
            _appModel.Object,
            _dataClient.Object,
            pdfService,
            _processReader.Object,
            services.BuildServiceProvider()
        );
    }

    [Fact]
    public async Task Request_In_Dev_Should_Generate()
    {
        IOptions<GeneralSettings> generalSettingsOptions = Options.Create<GeneralSettings>(
            new() { HostName = "local.altinn.cloud" }
        );

        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(x => x.HttpContext!.Request!.Query["lang"]).Returns(LanguageConst.Nb);

        var handler = new Mock<HttpMessageHandler>();
        var httpClient = new HttpClient(handler.Object);

        var logger = new Mock<ILogger<PdfGeneratorClient>>();
        var authenticationTokenResolver = BuildAuthenticationTokenResolver();

        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            authenticationTokenResolver.Object
        );
        var pdfService = NewPdfService(httpContextAccessor, pdfGeneratorClient, generalSettingsOptions);
        var pdfController = NewPdfController(pdfService);

        string? requestBody = null;
        using (
            var mockResponse = new HttpResponseMessage()
            {
                StatusCode = System.Net.HttpStatusCode.OK,
                Content = new StringContent("PDF"),
            }
        )
        {
            handler
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .Returns<HttpRequestMessage, CancellationToken>(
                    async (m, c) =>
                    {
                        requestBody = await m.Content!.ReadAsStringAsync();
                        return mockResponse;
                    }
                );

            var result = await pdfController.GetPdfPreview(_org, _app, _partyId, _instanceId);
            result.Should().BeOfType(typeof(FileStreamResult));
        }

        requestBody
            .Should()
            .Contain(
                @"url"":""http://local.altinn.cloud/org/app/instance/12345/e11e3e0b-a45c-48fb-a968-8d4ddf868c80?pdf=1"
            );
    }

    [Fact]
    public async Task Request_In_TT02_Should_Generate()
    {
        IOptions<GeneralSettings> generalSettingsOptions = Options.Create<GeneralSettings>(
            new() { HostName = "org.apps.tt02.altinn.no" }
        );

        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(x => x.HttpContext!.Request!.Query["lang"]).Returns(LanguageConst.Nb);

        var handler = new Mock<HttpMessageHandler>();
        var httpClient = new HttpClient(handler.Object);

        var logger = new Mock<ILogger<PdfGeneratorClient>>();
        var authenticationTokenResolver = BuildAuthenticationTokenResolver();

        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            authenticationTokenResolver.Object
        );
        var pdfService = NewPdfService(httpContextAccessor, pdfGeneratorClient, generalSettingsOptions);
        var pdfController = NewPdfController(pdfService);

        string? requestBody = null;
        using (
            var mockResponse = new HttpResponseMessage()
            {
                StatusCode = System.Net.HttpStatusCode.OK,
                Content = new StringContent("PDF"),
            }
        )
        {
            handler
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .Returns<HttpRequestMessage, CancellationToken>(
                    async (m, c) =>
                    {
                        requestBody = await m.Content!.ReadAsStringAsync();
                        return mockResponse;
                    }
                );

            var result = await pdfController.GetPdfPreview(_org, _app, _partyId, _instanceId);
            result.Should().BeOfType(typeof(FileStreamResult));
        }

        requestBody
            .Should()
            .Contain(
                @"url"":""http://org.apps.tt02.altinn.no/org/app/instance/12345/e11e3e0b-a45c-48fb-a968-8d4ddf868c80?pdf=1"
            );
    }

    [Fact]
    public async Task Request_For_Pdf_Service_Task_Should_Generate_That_Task()
    {
        _processReader
            .Setup(x => x.GetFlowElement("Task_Pdf"))
            .Returns(
                new ServiceTask
                {
                    Id = "Task_Pdf",
                    ExtensionElements = new()
                    {
                        TaskExtension = new()
                        {
                            TaskType = "pdf",
                            PdfConfiguration = new() { AutoPdfTaskIds = ["Task_1", "Task_2"] },
                        },
                    },
                }
            );

        (ActionResult result, string? requestBody) = await GetPdfPreview(taskId: "Task_Pdf");

        result.Should().BeOfType<FileStreamResult>();
        requestBody
            .Should()
            .Contain(
                @"url"":""http://local.altinn.cloud/org/app/instance/12345/e11e3e0b-a45c-48fb-a968-8d4ddf868c80/Task_Pdf?pdf=1"
            )
            .And.Contain("task=Task_1")
            .And.Contain("task=Task_2");
    }

    [Fact]
    public async Task Request_For_Subform_Pdf_Service_Task_Should_Generate_That_Subform()
    {
        SetupSubformPdfTask();

        (ActionResult result, string? requestBody) = await GetPdfPreview(
            taskId: "Task_SubformPdf",
            dataElementId: new Guid(SubformDataElementId)
        );

        result.Should().BeOfType<FileStreamResult>();
        requestBody
            .Should()
            .Contain(
                $@"url"":""http://local.altinn.cloud/org/app/instance/12345/e11e3e0b-a45c-48fb-a968-8d4ddf868c80/Task_SubformPdf/subform/subform-component/{SubformDataElementId}/?pdf=1"
            );
    }

    [Fact]
    public async Task Request_For_Subform_Pdf_Service_Task_Should_Only_Render_The_Subform()
    {
        // Like the service task, a subform PDF task renders its subform, even if the task has a PDF configuration too
        SetupSubformPdfTask(autoPdfTaskIds: ["Task_1"]);

        (ActionResult result, string? requestBody) = await GetPdfPreview(
            taskId: "Task_SubformPdf",
            dataElementId: new Guid(SubformDataElementId)
        );

        result.Should().BeOfType<FileStreamResult>();
        requestBody
            .Should()
            .Contain($"/Task_SubformPdf/subform/subform-component/{SubformDataElementId}/?pdf=1")
            .And.NotContain("task=Task_1");
    }

    [Theory]
    [InlineData(null)]
    [InlineData(ModelDataElementId)]
    [InlineData("00000000-0000-0000-0000-000000000001")]
    public async Task Request_For_Subform_Pdf_Service_Task_Without_A_Subform_Should_Return_BadRequest(
        string? dataElementId
    )
    {
        SetupSubformPdfTask();

        (ActionResult result, string? requestBody) = await GetPdfPreview(
            taskId: "Task_SubformPdf",
            dataElementId: dataElementId is null ? null : new Guid(dataElementId)
        );

        result.Should().BeOfType<BadRequestObjectResult>();
        requestBody.Should().BeNull();
    }

    [Theory]
    [InlineData("en", "lang=en")]
    [InlineData(null, "lang=nn")]
    public async Task Preview_Should_Be_In_The_Requested_Language_Or_The_Users(string? language, string expected)
    {
        _authenticationContext
            .Setup(s => s.Current)
            .Returns(
                TestAuthentication.GetUserAuthentication(
                    profileSettingPreference: new ProfileSettingPreference { Language = "nn" }
                )
            );

        (ActionResult result, string? requestBody) = await GetPdfPreview(taskId: null, language: language);

        result.Should().BeOfType<FileStreamResult>();
        requestBody.Should().Contain(expected);
    }

    [Fact]
    public async Task Request_For_Unknown_Task_Should_Return_NotFound()
    {
        (ActionResult result, string? requestBody) = await GetPdfPreview(taskId: "Task_Unknown");

        result.Should().BeOfType<NotFoundObjectResult>();
        requestBody.Should().BeNull();
    }

    [Fact]
    public async Task Request_For_Non_Pdf_Task_Should_Return_BadRequest()
    {
        _processReader
            .Setup(x => x.GetFlowElement("Task_Data"))
            .Returns(
                new ProcessTask
                {
                    Id = "Task_Data",
                    ExtensionElements = new() { TaskExtension = new() { TaskType = "data" } },
                }
            );

        (ActionResult result, string? requestBody) = await GetPdfPreview(taskId: "Task_Data");

        result.Should().BeOfType<BadRequestObjectResult>();
        requestBody.Should().BeNull();
    }

    private void SetupSubformPdfTask(List<string>? autoPdfTaskIds = null)
    {
        _processReader
            .Setup(x => x.GetFlowElement("Task_SubformPdf"))
            .Returns(
                new ServiceTask
                {
                    Id = "Task_SubformPdf",
                    ExtensionElements = new()
                    {
                        TaskExtension = new()
                        {
                            TaskType = "subformPdf",
                            PdfConfiguration = autoPdfTaskIds is null
                                ? null
                                : new() { AutoPdfTaskIds = autoPdfTaskIds },
                            SubformPdfConfiguration = new()
                            {
                                SubformComponentId = "subform-component",
                                SubformDataTypeId = "subform-model",
                            },
                        },
                    },
                }
            );
    }

    private async Task<(ActionResult Result, string? RequestBody)> GetPdfPreview(
        string? taskId,
        Guid? dataElementId = null,
        string? language = null
    )
    {
        IOptions<GeneralSettings> generalSettingsOptions = Options.Create<GeneralSettings>(
            new() { HostName = "local.altinn.cloud" }
        );

        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(x => x.HttpContext!.Request!.Query["lang"]).Returns(LanguageConst.Nb);

        var handler = new Mock<HttpMessageHandler>();
        var pdfGeneratorClient = new PdfGeneratorClient(
            new Mock<ILogger<PdfGeneratorClient>>().Object,
            new HttpClient(handler.Object),
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            BuildAuthenticationTokenResolver().Object
        );
        var pdfController = NewPdfController(
            NewPdfService(httpContextAccessor, pdfGeneratorClient, generalSettingsOptions)
        );

        string? requestBody = null;
        using var mockResponse = new HttpResponseMessage()
        {
            StatusCode = System.Net.HttpStatusCode.OK,
            Content = new StringContent("PDF"),
        };
        handler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Returns<HttpRequestMessage, CancellationToken>(
                async (m, c) =>
                {
                    requestBody = await m.Content!.ReadAsStringAsync();
                    return mockResponse;
                }
            );

        ActionResult result = await pdfController.GetPdfPreview(
            _org,
            _app,
            _partyId,
            _instanceId,
            taskId,
            dataElementId,
            language
        );
        return (result, requestBody);
    }

    private static Mock<IAuthenticationTokenResolver> BuildAuthenticationTokenResolver()
    {
        var authenticationTokenResolver = new Mock<IAuthenticationTokenResolver>();
        authenticationTokenResolver
            .Setup(a => a.GetAccessToken(It.IsAny<AuthenticationMethod>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(JwtToken.Parse(TestAuthentication.GetUserToken()));
        return authenticationTokenResolver;
    }
}
