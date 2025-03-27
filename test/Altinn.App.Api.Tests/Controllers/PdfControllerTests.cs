using Altinn.App.Api.Controllers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Infrastructure.Clients.Pdf;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
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
    private readonly Mock<IUserTokenProvider> _userTokenProvider = new();

    private readonly IOptions<PdfGeneratorSettings> _pdfGeneratorSettingsOptions = Options.Create<PdfGeneratorSettings>(
        new() { }
    );

    private readonly Mock<IAuthenticationContext> _authenticationContext = new();

    private readonly Mock<ILogger<PdfService>> _logger = new();

    public PdfControllerTests()
    {
        _instanceClient
            .Setup(a => a.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
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
    }

    private PdfService NewPdfService(
        Mock<IHttpContextAccessor> httpContextAccessor,
        PdfGeneratorClient pdfGeneratorClient,
        IOptions<GeneralSettings> generalSettingsOptions
    )
    {
        var pdfService = new PdfService(
            _appResources.Object,
            _dataClient.Object,
            httpContextAccessor.Object,
            pdfGeneratorClient,
            _pdfGeneratorSettingsOptions,
            generalSettingsOptions,
            _logger.Object,
            _authenticationContext.Object
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
        string? frontendVersion = null;
        httpContextAccessor
            .Setup(x => x.HttpContext!.Request!.Cookies.TryGetValue("frontendVersion", out frontendVersion))
            .Returns(false);

        var handler = new Mock<HttpMessageHandler>();
        var httpClient = new HttpClient(handler.Object);

        var logger = new Mock<ILogger<PdfGeneratorClient>>();

        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            _userTokenProvider.Object,
            httpContextAccessor.Object
        );
        var pdfService = NewPdfService(httpContextAccessor, pdfGeneratorClient, generalSettingsOptions);
        var pdfController = new PdfController(
            _instanceClient.Object,
            _pdfFormatter.Object,
            _appResources.Object,
            _appModel.Object,
            _dataClient.Object,
            pdfService
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
                .Callback<HttpRequestMessage, CancellationToken>(
                    (m, c) => requestBody = m.Content!.ReadAsStringAsync().Result
                )
                .ReturnsAsync(mockResponse);

            var result = await pdfController.GetPdfPreview(_org, _app, _partyId, _instanceId);
            result.Should().BeOfType(typeof(FileStreamResult));
        }

        requestBody
            .Should()
            .Contain(
                @"url"":""http://local.altinn.cloud/org/app/#/instance/12345/e11e3e0b-a45c-48fb-a968-8d4ddf868c80?pdf=1"
            );
        requestBody.Should().NotContain(@"name"":""frontendVersion");
    }

    [Fact]
    public async Task Request_In_Dev_Should_Include_Frontend_Version()
    {
        IOptions<GeneralSettings> generalSettingsOptions = Options.Create<GeneralSettings>(
            new() { HostName = "local.altinn.cloud" }
        );

        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(x => x.HttpContext!.Request!.Query["lang"]).Returns(LanguageConst.Nb);
        string? frontendVersion = "https://altinncdn.no/toolkits/altinn-app-frontend/3/";
        httpContextAccessor
            .Setup(x => x.HttpContext!.Request!.Cookies.TryGetValue("frontendVersion", out frontendVersion))
            .Returns(true);

        var handler = new Mock<HttpMessageHandler>();
        var httpClient = new HttpClient(handler.Object);

        var logger = new Mock<ILogger<PdfGeneratorClient>>();

        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            _userTokenProvider.Object,
            httpContextAccessor.Object
        );
        var pdfService = NewPdfService(httpContextAccessor, pdfGeneratorClient, generalSettingsOptions);
        var pdfController = new PdfController(
            _instanceClient.Object,
            _pdfFormatter.Object,
            _appResources.Object,
            _appModel.Object,
            _dataClient.Object,
            pdfService
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
                .Callback<HttpRequestMessage, CancellationToken>(
                    (m, c) => requestBody = m.Content!.ReadAsStringAsync().Result
                )
                .ReturnsAsync(mockResponse);

            var result = await pdfController.GetPdfPreview(_org, _app, _partyId, _instanceId);
            result.Should().BeOfType(typeof(FileStreamResult));
        }

        requestBody
            .Should()
            .Contain(
                @"url"":""http://local.altinn.cloud/org/app/#/instance/12345/e11e3e0b-a45c-48fb-a968-8d4ddf868c80?pdf=1"
            );
        requestBody
            .Should()
            .Contain(@"name"":""frontendVersion"",""value"":""https://altinncdn.no/toolkits/altinn-app-frontend/3/""");
    }

    [Fact]
    public async Task Request_In_TT02_Should_Ignore_Frontend_Version()
    {
        IOptions<GeneralSettings> generalSettingsOptions = Options.Create<GeneralSettings>(
            new() { HostName = "org.apps.tt02.altinn.no" }
        );

        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(x => x.HttpContext!.Request!.Query["lang"]).Returns(LanguageConst.Nb);
        string? frontendVersion = "https://altinncdn.no/toolkits/altinn-app-frontend/3/";
        httpContextAccessor
            .Setup(x => x.HttpContext!.Request!.Cookies.TryGetValue("frontendVersion", out frontendVersion))
            .Returns(true);

        var handler = new Mock<HttpMessageHandler>();
        var httpClient = new HttpClient(handler.Object);

        var logger = new Mock<ILogger<PdfGeneratorClient>>();

        var pdfGeneratorClient = new PdfGeneratorClient(
            logger.Object,
            httpClient,
            _pdfGeneratorSettingsOptions,
            _platformSettingsOptions,
            _userTokenProvider.Object,
            httpContextAccessor.Object
        );
        var pdfService = NewPdfService(httpContextAccessor, pdfGeneratorClient, generalSettingsOptions);
        var pdfController = new PdfController(
            _instanceClient.Object,
            _pdfFormatter.Object,
            _appResources.Object,
            _appModel.Object,
            _dataClient.Object,
            pdfService
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
                .Callback<HttpRequestMessage, CancellationToken>(
                    (m, c) => requestBody = m.Content!.ReadAsStringAsync().Result
                )
                .ReturnsAsync(mockResponse);

            var result = await pdfController.GetPdfPreview(_org, _app, _partyId, _instanceId);
            result.Should().BeOfType(typeof(FileStreamResult));
        }

        requestBody
            .Should()
            .Contain(
                @"url"":""http://org.apps.tt02.altinn.no/org/app/#/instance/12345/e11e3e0b-a45c-48fb-a968-8d4ddf868c80?pdf=1"
            );
        requestBody.Should().NotContain(@"name"":""frontendVersion");
    }
}
