#nullable disable
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.ExternalApi;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.FeatureManagement;
using Moq;

namespace Altinn.App.Core.Tests.Implementation;

public class AppResourcesSITests
{
    private readonly string _appBasePath =
        Path.Join(PathUtils.GetCoreTestsPath(), "Implementation", "TestData") + Path.DirectorySeparatorChar;
    private readonly TelemetrySink _telemetry = new();

    [Fact]
    public void GetApplication_desrializes_file_from_disk()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "default.applicationmetadata.json");
        var settings = Options.Create(appSettings);
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        AppResourcesSI appResources = new(
            settings,
            appMetadata,
            null,
            new NullLogger<AppResourcesSI>(),
            _telemetry.Object
        );
        Application expected = new()
        {
            Id = "tdd/bestilling",
            Org = "tdd",
            Created = DateTime.Parse("2019-09-16T22:22:22"),
            CreatedBy = "username",
            Title = new Dictionary<string, string>() { { "nb", "Bestillingseksempelapp" } },
            DataTypes = new List<DataType>()
            {
                new()
                {
                    Id = "vedlegg",
                    AllowedContentTypes = ["application/pdf", "image/png", "image/jpeg"],
                    MinCount = 0,
                    TaskId = "Task_1",
                },
                new()
                {
                    Id = "ref-data-as-pdf",
                    AllowedContentTypes = ["application/pdf"],
                    MinCount = 1,
                    TaskId = "Task_1",
                },
            },
            PartyTypesAllowed = new PartyTypesAllowed()
            {
                BankruptcyEstate = true,
                Organisation = true,
                Person = true,
                SubUnit = true,
            },
            OnEntry = new OnEntry() { Show = "select-instance" },
        };
        var actual = appResources.GetApplication();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void GetApplication_handles_onEntry_null()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "no-on-entry.applicationmetadata.json");
        var settings = Options.Create(appSettings);
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        AppResourcesSI appResources = new(
            settings,
            appMetadata,
            null,
            new NullLogger<AppResourcesSI>(),
            _telemetry.Object
        );
        Application expected = new Application()
        {
            Id = "tdd/bestilling",
            Org = "tdd",
            Created = DateTime.Parse("2019-09-16T22:22:22"),
            CreatedBy = "username",
            Title = new Dictionary<string, string>() { { "nb", "Bestillingseksempelapp" } },
            DataTypes =
            [
                new()
                {
                    Id = "vedlegg",
                    AllowedContentTypes = ["application/pdf", "image/png", "image/jpeg"],
                    MinCount = 0,
                    TaskId = "Task_1",
                },
                new()
                {
                    Id = "ref-data-as-pdf",
                    AllowedContentTypes = ["application/pdf"],
                    MinCount = 1,
                    TaskId = "Task_1",
                },
            ],
            PartyTypesAllowed = new PartyTypesAllowed()
            {
                BankruptcyEstate = true,
                Organisation = true,
                Person = true,
                SubUnit = true,
            },
        };
        var actual = appResources.GetApplication();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void GetApplication_second_read_from_cache()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "default.applicationmetadata.json");
        Mock<IFrontendFeatures> appFeaturesMock = new();
        appFeaturesMock
            .Setup(af => af.GetFrontendFeatures())
            .ReturnsAsync(new Dictionary<string, bool>() { { "footer", true } });
        var settings = Options.Create(appSettings);
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings), appFeaturesMock.Object);
        AppResourcesSI appResources = new(
            settings,
            appMetadata,
            null,
            new NullLogger<AppResourcesSI>(),
            _telemetry.Object
        );
        Application expected = new()
        {
            Id = "tdd/bestilling",
            Org = "tdd",
            Created = DateTime.Parse("2019-09-16T22:22:22"),
            CreatedBy = "username",
            Title = new Dictionary<string, string>() { { "nb", "Bestillingseksempelapp" } },
            DataTypes = new List<DataType>()
            {
                new()
                {
                    Id = "vedlegg",
                    AllowedContentTypes = ["application/pdf", "image/png", "image/jpeg"],
                    MinCount = 0,
                    TaskId = "Task_1",
                },
                new()
                {
                    Id = "ref-data-as-pdf",
                    AllowedContentTypes = ["application/pdf"],
                    MinCount = 1,
                    TaskId = "Task_1",
                },
            },
            PartyTypesAllowed = new PartyTypesAllowed()
            {
                BankruptcyEstate = true,
                Organisation = true,
                Person = true,
                SubUnit = true,
            },
            OnEntry = new OnEntry() { Show = "select-instance" },
        };
        var actual = appResources.GetApplication();
        var actual2 = appResources.GetApplication();
        appFeaturesMock.Verify(af => af.GetFrontendFeatures());
        appFeaturesMock.VerifyAll();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);
        actual2.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void GetApplicationMetadata_throws_ApplicationConfigException_if_file_not_found()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "notfound.applicationmetadata.json");
        var settings = Options.Create(appSettings);
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(
            settings,
            appMetadata,
            null,
            new NullLogger<AppResourcesSI>(),
            _telemetry.Object
        );
        Assert.Throws<ApplicationConfigException>(() => appResources.GetApplication());
    }

    [Fact]
    public void GetApplicationMetadata_throws_ApplicationConfigException_if_deserialization_fails()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "invalid.applicationmetadata.json");
        var settings = Options.Create(appSettings);
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(
            settings,
            appMetadata,
            null,
            new NullLogger<AppResourcesSI>(),
            _telemetry.Object
        );
        Assert.Throws<ApplicationConfigException>(() => appResources.GetApplication());
    }

    [Fact]
    public void GetApplicationXACMLPolicy_return_policyfile_as_string()
    {
        AppSettings appSettings = GetAppSettings(subfolder: "AppPolicy", policyFilename: "policy.xml");
        var settings = Options.Create(appSettings);
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(
            settings,
            appMetadata,
            null,
            new NullLogger<AppResourcesSI>(),
            _telemetry.Object
        );
        string expected = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + Environment.NewLine + "<root>policy</root>";
        var actual = appResources.GetApplicationXACMLPolicy();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void GetApplicationXACMLPolicy_return_null_if_file_not_found()
    {
        AppSettings appSettings = GetAppSettings(subfolder: "AppPolicy", policyFilename: "notfound.xml");
        var settings = Options.Create(appSettings);
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(
            settings,
            appMetadata,
            null,
            new NullLogger<AppResourcesSI>(),
            _telemetry.Object
        );
        var actual = appResources.GetApplicationXACMLPolicy();
        actual.Should().BeNull();
    }

    [Fact]
    public void GetApplicationBPMNProcess_return_process_as_string()
    {
        AppSettings appSettings = GetAppSettings(subfolder: "AppProcess", bpmnFilename: "process.bpmn");
        var settings = Options.Create(appSettings);
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(
            settings,
            appMetadata,
            null,
            new NullLogger<AppResourcesSI>(),
            _telemetry.Object
        );
        string expected = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + Environment.NewLine + "<root>process</root>";
        var actual = appResources.GetApplicationBPMNProcess();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void GetApplicationBPMNProcess_return_null_if_file_not_found()
    {
        AppSettings appSettings = GetAppSettings(subfolder: "AppProcess", policyFilename: "notfound.xml");
        var settings = Options.Create(appSettings);
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(
            settings,
            appMetadata,
            null,
            new NullLogger<AppResourcesSI>(),
            _telemetry.Object
        );
        var actual = appResources.GetApplicationBPMNProcess();
        actual.Should().BeNull();
    }

    private AppSettings GetAppSettings(
        string subfolder,
        string appMetadataFilename = "",
        string bpmnFilename = "",
        string policyFilename = ""
    )
    {
        AppSettings appSettings = new AppSettings()
        {
            AppBasePath = _appBasePath,
            ConfigurationFolder = subfolder + Path.DirectorySeparatorChar,
            AuthorizationFolder = string.Empty,
            ProcessFolder = string.Empty,
            ApplicationMetadataFileName = appMetadataFilename,
            ProcessFileName = bpmnFilename,
            ApplicationXACMLPolicyFileName = policyFilename,
        };
        return appSettings;
    }

    private static IAppMetadata SetupAppMetadata(
        IOptions<AppSettings> appsettings,
        IFrontendFeatures frontendFeatures = null
    )
    {
        var featureManagerMock = new Mock<IFeatureManager>();
        var serviceProvider = new ServiceCollection()
            .AddSingleton(Mock.Of<IExternalApiFactory>())
            .BuildStrictServiceProvider();

        if (frontendFeatures == null)
        {
            return new AppMetadata(appsettings, new FrontendFeatures(featureManagerMock.Object), serviceProvider);
        }

        return new AppMetadata(appsettings, frontendFeatures, serviceProvider);
    }
}
