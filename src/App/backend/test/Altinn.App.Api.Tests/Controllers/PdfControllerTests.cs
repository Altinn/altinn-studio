using System.Text.Json;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Models;
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
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.Elements.Base;
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
                    }
                )
            );

        _authenticationContext.Setup(s => s.Current).Returns(TestAuthentication.GetUserAuthentication());

        // The current task, "Task_1", is an ordinary data task by default.
        var dataTask = new ProcessTask
        {
            Id = _taskId,
            ExtensionElements = new ExtensionElements { TaskExtension = new AltinnTaskExtension { TaskType = "data" } },
        };
        _processReader.Setup(x => x.GetFlowElement(_taskId)).Returns(dataTask);
        _processReader.Setup(x => x.GetAltinnTaskExtension(_taskId)).Returns(dataTask.ExtensionElements.TaskExtension);
        _processReader.Setup(x => x.GetProcessTasks()).Returns([dataTask]);
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

    private PdfController NewPdfController(IPdfService pdfService) =>
        new(
            _instanceClient.Object,
            _pdfFormatter.Object,
            _appResources.Object,
            _appModel.Object,
            _dataClient.Object,
            pdfService,
            _processReader.Object
        );

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
    public async Task Request_ForPdfServiceTask_WithTaskIdAndAutoPdfTaskIds_ShouldIncludeTaskPathAndAutoPdfQuery()
    {
        var pdfTask = new ProcessTask
        {
            Id = "Task_Pdf",
            ExtensionElements = new ExtensionElements
            {
                TaskExtension = new AltinnTaskExtension
                {
                    TaskType = "pdf",
                    PdfConfiguration = new AltinnPdfConfiguration { AutoPdfTaskIds = ["Task_1"] },
                },
            },
        };
        _processReader.Setup(x => x.GetFlowElement("Task_Pdf")).Returns(pdfTask);
        _processReader
            .Setup(x => x.GetAltinnTaskExtension("Task_Pdf"))
            .Returns(pdfTask.ExtensionElements.TaskExtension);

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

        var result = await pdfController.GetPdfPreview(_org, _app, _partyId, _instanceId, taskId: "Task_Pdf");
        result.Should().BeOfType(typeof(FileStreamResult));

        requestBody
            .Should()
            .Contain(
                @"url"":""http://local.altinn.cloud/org/app/instance/12345/e11e3e0b-a45c-48fb-a968-8d4ddf868c80/Task_Pdf?pdf=1"
            );
        requestBody.Should().Contain("task=Task_1");
    }

    [Fact]
    public async Task Request_ForPdfServiceTask_WithNothingToRender_ShouldReturn400()
    {
        var pdfTask = new ProcessTask
        {
            Id = "Task_Pdf",
            ExtensionElements = new ExtensionElements { TaskExtension = new AltinnTaskExtension { TaskType = "pdf" } },
        };
        _processReader.Setup(x => x.GetFlowElement("Task_Pdf")).Returns(pdfTask);
        _processReader
            .Setup(x => x.GetAltinnTaskExtension("Task_Pdf"))
            .Returns(pdfTask.ExtensionElements.TaskExtension);
        // No AutoPdfTaskIds configured, and _appResources.GetLayoutSettingsForFolder is unconfigured (returns
        // null by default), so there is nothing this task could render a preview from.

        IOptions<GeneralSettings> generalSettingsOptions = Options.Create<GeneralSettings>(
            new() { HostName = "local.altinn.cloud" }
        );
        var httpContextAccessor = new Mock<IHttpContextAccessor>();
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

        var result = await pdfController.GetPdfPreview(_org, _app, _partyId, _instanceId, taskId: "Task_Pdf");

        var objectResult = result.Should().BeAssignableTo<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(400);
    }

    [Fact]
    public async Task GetPdfPreviewTasks_ReturnsPdfAndSubformPdfTasksWithTheirDataElements()
    {
        var pdfTask = new ProcessTask
        {
            Id = "Task_Pdf",
            Name = "PDF",
            ExtensionElements = new ExtensionElements
            {
                TaskExtension = new AltinnTaskExtension
                {
                    TaskType = "pdf",
                    PdfConfiguration = new AltinnPdfConfiguration { AutoPdfTaskIds = ["Task_1"] },
                },
            },
        };
        var subformPdfTask = new ProcessTask
        {
            Id = "Task_SubformPdf",
            Name = "Subform PDF",
            ExtensionElements = new ExtensionElements
            {
                TaskExtension = new AltinnTaskExtension
                {
                    TaskType = "subformPdf",
                    SubformPdfConfiguration = new AltinnSubformPdfConfiguration
                    {
                        SubformComponentId = "subform-x",
                        SubformDataTypeId = "Sub",
                    },
                },
            },
        };
        var dataTask = new ProcessTask
        {
            Id = _taskId,
            ExtensionElements = new ExtensionElements { TaskExtension = new AltinnTaskExtension { TaskType = "data" } },
        };
        _processReader.Setup(x => x.GetProcessTasks()).Returns([dataTask, pdfTask, subformPdfTask]);

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
            .ReturnsAsync(
                new Instance()
                {
                    Org = _org,
                    AppId = $"{_org}/{_app}",
                    Id = $"{_partyId}/{_instanceId}",
                    Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = _taskId } },
                    Data =
                    [
                        new DataElement { Id = "elem-1", DataType = "Sub" },
                        new DataElement { Id = "elem-2", DataType = "OtherType" },
                    ],
                }
            );

        var pdfController = NewPdfController(new Mock<IPdfService>().Object);

        var result = await pdfController.GetPdfPreviewTasks(_org, _app, _partyId, _instanceId);

        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<PdfPreviewTasksResponse>().Subject;

        response.Tasks.Should().HaveCount(2);

        var returnedPdfTask = response.Tasks.Single(t => t.TaskId == "Task_Pdf");
        returnedPdfTask.TaskType.Should().Be("pdf");
        returnedPdfTask.AutoPdfTaskIds.Should().BeEquivalentTo(["Task_1"]);

        var returnedSubformPdfTask = response.Tasks.Single(t => t.TaskId == "Task_SubformPdf");
        returnedSubformPdfTask.TaskType.Should().Be("subformPdf");
        returnedSubformPdfTask.SubformComponentId.Should().Be("subform-x");
        returnedSubformPdfTask.SubformDataTypeId.Should().Be("Sub");
        returnedSubformPdfTask.DataElements.Should().ContainSingle(d => d.Id == "elem-1" && d.DataType == "Sub");
    }

    [Theory]
    [InlineData(null, null, "Task_1")]
    [InlineData("Task_Pdf", null, "Task_Pdf")]
    [InlineData("Task_1", "Subform", "Subform")]
    [InlineData(null, "Subform", "Subform")]
    public async Task GetPdfFormat_UsesRenderedFolderExclusions(string? taskId, string? uiFolder, string expectedFolder)
    {
        var dataId = Guid.NewGuid();
        var instance = SetupPdfFormatInstance(dataId);
        var model = new object();
        Dictionary<string, LayoutSettings> folders = new()
        {
            ["Task_1"] = new()
            {
                Pages = new Pages { ExcludeFromPdf = ["current-page"] },
                Components = new Components { ExcludeFromPdf = ["current-component"] },
            },
            ["Task_Pdf"] = new()
            {
                Pages = new Pages { ExcludeFromPdf = ["internal-page"] },
                Components = new Components { ExcludeFromPdf = ["internal-component"] },
            },
            ["Subform"] = new()
            {
                Pages = new Pages { ExcludeFromPdf = ["subform-page"] },
                Components = new Components { ExcludeFromPdf = ["subform-component"] },
            },
        };
        _appResources.Setup(r => r.GetUiConfiguration()).Returns(new UiConfiguration { Folders = folders });
        _dataClient
            .Setup(d => d.GetFormData(_instanceId, typeof(object), _org, _app, _partyId, dataId))
            .ReturnsAsync(model);
        _pdfFormatter
            .Setup(f => f.FormatPdf(It.IsAny<LayoutSettings>(), model, instance))
            .ReturnsAsync((LayoutSettings settings, object data, Instance currentInstance) => settings);
        var controller = NewPdfController(new Mock<IPdfService>().Object);

        // Exercise the existing overload too: callers without render context keep current-task formatting.
        var result =
            taskId is null && uiFolder is null
                ? await controller.GetPdfFormat(_org, _app, _partyId, _instanceId, dataId)
                : await controller.GetPdfFormat(_org, _app, _partyId, _instanceId, dataId, taskId, uiFolder);

        var response = Assert.IsType<OkObjectResult>(result);
        var json = JsonSerializer.SerializeToElement(response.Value);
        Assert.Equal(
            folders[expectedFolder].Pages!.ExcludeFromPdf,
            json.GetProperty("ExcludedPages").Deserialize<string[]>()
        );
        Assert.Equal(
            folders[expectedFolder].Components!.ExcludeFromPdf,
            json.GetProperty("ExcludedComponents").Deserialize<string[]>()
        );
        _pdfFormatter.Verify(f => f.FormatPdf(folders[expectedFolder], model, instance), Times.Once);
        Assert.Equal(_taskId, instance.Process.CurrentTask.ElementId);
    }

    [Theory]
    [InlineData("Unknown_Task", null)]
    [InlineData("Task_1", "Unknown_Subform")]
    public async Task GetPdfFormat_UnknownExplicitFolder_DoesNotUseCurrentTask(string? taskId, string? uiFolder)
    {
        var dataId = Guid.NewGuid();
        SetupPdfFormatInstance(dataId);
        _appResources
            .Setup(r => r.GetUiConfiguration())
            .Returns(new UiConfiguration { Folders = new() { [_taskId] = new() } });
        var controller = NewPdfController(new Mock<IPdfService>().Object);

        var result = await controller.GetPdfFormat(_org, _app, _partyId, _instanceId, dataId, taskId, uiFolder);

        Assert.IsType<NotFoundObjectResult>(result);
        _pdfFormatter.Verify(
            f => f.FormatPdf(It.IsAny<LayoutSettings>(), It.IsAny<object>(), It.IsAny<Instance>()),
            Times.Never
        );
    }

    private Instance SetupPdfFormatInstance(Guid dataId)
    {
        var instance = new Instance
        {
            Org = _org,
            AppId = $"{_org}/{_app}",
            Id = $"{_partyId}/{_instanceId}",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = _taskId } },
            Data = [new DataElement { Id = dataId.ToString(), DataType = "model" }],
        };
        _instanceClient
            .Setup(c => c.GetInstance(_app, _org, _partyId, _instanceId, null, CancellationToken.None))
            .ReturnsAsync(instance);
        _appResources.Setup(r => r.GetClassRefForLogicDataType("model")).Returns("Model");
        _appModel.Setup(m => m.GetModelType("Model")).Returns(typeof(object));
        return instance;
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
