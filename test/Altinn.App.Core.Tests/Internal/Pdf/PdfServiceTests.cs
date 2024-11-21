using System.Net;
using System.Security.Claims;
using Altinn.App.Common.Tests;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Infrastructure.Clients.Pdf;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.PlatformServices.Tests.Helpers;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Constants;
using Castle.Core.Logging;
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
    private readonly Mock<IProfileClient> _profile = new();
    private readonly IOptions<PdfGeneratorSettings> _pdfGeneratorSettingsOptions = Options.Create<PdfGeneratorSettings>(
        new() { }
    );

    private readonly IOptions<GeneralSettings> _generalSettingsOptions = Options.Create<GeneralSettings>(
        new() { HostName = HostName }
    );

    private readonly IOptions<PlatformSettings> _platformSettingsOptions = Options.Create<PlatformSettings>(new() { });

    private readonly Mock<IUserTokenProvider> _userTokenProvider;

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
    }

    [Fact]
    public async Task ValidRequest_ShouldReturnPdf()
    {
        DelegatingHandlerStub delegatingHandler = new(
            async (HttpRequestMessage request, CancellationToken token) =>
            {
                await Task.CompletedTask;
                return new HttpResponseMessage()
                {
                    Content = new StreamContent(
                        EmbeddedResource.LoadDataAsStream("Altinn.App.Core.Tests.Internal.Pdf.TestData.example.pdf")
                    ),
                };
            }
        );

        var httpClient = new HttpClient(delegatingHandler);
        var pdfGeneratorClient = new PdfGeneratorClient(
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
        var pdfGeneratorClient = new PdfGeneratorClient(
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
                    It.Is<string>(s => s == "Task_1")
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
                    It.Is<string>(s => s == "Task_1")
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task GetLanguage_ShouldReturnLanguageFromUserPreference()
    {
        // Arrange
        var profileMock = new Mock<IProfileClient>();
        profileMock
            .Setup(s => s.GetUserProfile(It.IsAny<int>()))
            .Returns(
                Task.FromResult<UserProfile?>(
                    new UserProfile
                    {
                        UserId = 123,
                        ProfileSettingPreference = new ProfileSettingPreference { Language = LanguageConst.En },
                    }
                )
            );
        var user = new ClaimsPrincipal(new ClaimsIdentity([new(AltinnCoreClaimTypes.UserId, "123")], "TestAuthType"));

        var target = SetupPdfService(profile: profileMock);

        // Act
        var language = await target.GetLanguage(user);

        // Assert
        language.Should().Be(LanguageConst.En);
    }

    [Fact]
    public async Task GetLanguage_NoLanguageInUserPreference_ShouldReturnBokmål()
    {
        // Arrange
        var profileMock = new Mock<IProfileClient>();
        profileMock
            .Setup(s => s.GetUserProfile(It.IsAny<int>()))
            .Returns(
                Task.FromResult<UserProfile?>(
                    new UserProfile
                    {
                        UserId = 123,
                        ProfileSettingPreference = new ProfileSettingPreference
                        {
                            /* No language preference set*/
                        },
                    }
                )
            );
        var user = new ClaimsPrincipal(new ClaimsIdentity([new(AltinnCoreClaimTypes.UserId, "123")], "TestAuthType"));

        var target = SetupPdfService(profile: profileMock);

        // Act
        var language = await target.GetLanguage(user);

        // Assert
        language.Should().Be(LanguageConst.Nb);
    }

    [Fact]
    public async Task GetLanguage_UserIsNull_ShouldReturnBokmål()
    {
        // Arrange
        ClaimsPrincipal? user = null;
        var target = SetupPdfService();

        // Act
        var language = await target.GetLanguage(user);

        // Assert
        language.Should().Be(LanguageConst.Nb);
    }

    [Fact]
    public async Task GetLanguage_UserProfileIsNull_ShouldThrow()
    {
        // Arrange
        var user = new ClaimsPrincipal(new ClaimsIdentity([new(AltinnCoreClaimTypes.UserId, "123")], "TestAuthType"));

        var profileMock = new Mock<IProfileClient>();
        profileMock.Setup(s => s.GetUserProfile(It.IsAny<int>())).Returns(Task.FromResult<UserProfile?>(null));

        var target = SetupPdfService(profile: profileMock);

        // Act
        var func = async () => await target.GetLanguage(user);

        // Assert
        await func.Should().ThrowAsync<Exception>().WithMessage("Could not get user profile while getting language");
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
        TelemetrySink? telemetrySink = null
    )
    {
        return new PdfService(
            appResources?.Object ?? _appResources.Object,
            dataClient?.Object ?? _dataClient.Object,
            httpContentAccessor?.Object ?? _httpContextAccessor.Object,
            profile?.Object ?? _profile.Object,
            pdfGeneratorClient?.Object ?? _pdfGeneratorClient.Object,
            pdfGeneratorSettingsOptions ?? _pdfGeneratorSettingsOptions,
            generalSettingsOptions ?? _generalSettingsOptions,
            _logger.Object,
            telemetrySink?.Object
        );
    }
}
