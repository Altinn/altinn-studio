using Altinn.App.Api.Controllers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
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
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
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

    private readonly IOptions<PdfGeneratorSettings> _pdfGeneratorSettingsOptions = Options.Create<PdfGeneratorSettings>(
        new() { }
    );

    private readonly Mock<IAuthenticationContext> _authenticationContext = new();

    private readonly Mock<ILogger<PdfService>> _logger = new();
    private readonly Mock<ITranslationService> _translationService = new();

    public PdfControllerTests()
    {
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
            .Returns(
                Task.FromResult(
                    new Instance()
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
                    }
                )
            );

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
        var pdfController = new PdfController(
            _instanceClient.Object,
            _pdfFormatter.Object,
            _appResources.Object,
            _appModel.Object,
            _dataClient.Object,
            pdfService,
            _processReader.Object
        );

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
        var pdfController = new PdfController(
            _instanceClient.Object,
            _pdfFormatter.Object,
            _appResources.Object,
            _appModel.Object,
            _dataClient.Object,
            pdfService,
            _processReader.Object
        );

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

    [Fact]
    public async Task Request_For_Unknown_Task_Should_Return_NotFound()
    {
        (ActionResult result, string? requestBody) = await GetPdfPreview(taskId: "Task_Unknown");

        result.Should().BeOfType<NotFoundObjectResult>();
        requestBody.Should().BeNull();
    }

    private void SetupSubformPdfTask()
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
        string taskId,
        Guid? dataElementId = null
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
        var pdfController = new PdfController(
            _instanceClient.Object,
            _pdfFormatter.Object,
            _appResources.Object,
            _appModel.Object,
            _dataClient.Object,
            NewPdfService(httpContextAccessor, pdfGeneratorClient, generalSettingsOptions),
            _processReader.Object
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
            dataElementId
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
