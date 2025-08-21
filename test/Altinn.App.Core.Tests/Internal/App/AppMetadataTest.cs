using System.Text.Encodings.Web;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.ExternalApi;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Microsoft.FeatureManagement;
using Moq;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Altinn.App.Core.Tests.Internal.App;

public class AppMetadataTest
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly string _appBasePath =
        Path.Join(PathUtils.GetCoreTestsPath(), "Internal", "App", "TestData") + Path.DirectorySeparatorChar;

    [Fact]
    public async Task GetApplicationMetadata_desrializes_file_from_disk()
    {
        var featureManagerMock = new Mock<IFeatureManager>();
        FrontendFeatures frontendFeatures = new(featureManagerMock.Object);
        Dictionary<string, bool> enabledFrontendFeatures = await frontendFeatures.GetFrontendFeatures();
        TelemetrySink telemetrySink = new();

        AppSettings appSettings = GetAppSettings("AppMetadata", "default.applicationmetadata.json");

        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings), null, null, telemetrySink);
        ApplicationMetadata expected = new("tdd/bestilling")
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
                    AllowedContentTypes = new List<string>() { "application/pdf", "image/png", "image/jpeg" },
                    MinCount = 0,
                    TaskId = "Task_1",
                },
                new()
                {
                    Id = "ref-data-as-pdf",
                    AllowedContentTypes = new List<string>() { "application/pdf" },
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
            OnEntry = new OnEntry() { Show = "select-instance" },
            Features = enabledFrontendFeatures,
            ExternalApiIds = [],
        };
        var actual = await appMetadata.GetApplicationMetadata();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);

        await Verify(telemetrySink.GetSnapshot());
    }

    [Fact]
    public async Task GetApplicationMetadata_eformidling_desrializes_file_from_disk()
    {
        var featureManagerMock = new Mock<IFeatureManager>();
        FrontendFeatures frontendFeatures = new(featureManagerMock.Object);
        Dictionary<string, bool> enabledFrontendFeatures = await frontendFeatures.GetFrontendFeatures();

        AppSettings appSettings = GetAppSettings("AppMetadata", "eformid.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        ApplicationMetadata expected = new("tdd/bestilling")
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
            EFormidling = new EFormidlingContract()
            {
                ServiceId = "DPF",
                DPFShipmentType = "altinn3.skjema",
                Receiver = "910123456",
                SendAfterTaskId = "Task_1",
                Process = "urn:no:difi:profile:arkivmelding:administrasjon:ver1.0",
                Standard = "urn:no:difi:arkivmelding:xsd::arkivmelding",
                TypeVersion = "2.0",
                Type = "arkivmelding",
                SecurityLevel = 3,
                DataTypes = ["372c7af5-71e1-4e99-8e05-4716711a8b53"],
            },
            OnEntry = new OnEntry() { Show = "select-instance" },
            Features = enabledFrontendFeatures,
            ExternalApiIds = [],
        };
        var actual = await appMetadata.GetApplicationMetadata();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetApplicationMetadata_second_read_from_cache()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "default.applicationmetadata.json");
        Mock<IFrontendFeatures> appFeaturesMock = new();
        appFeaturesMock
            .Setup(af => af.GetFrontendFeatures())
            .ReturnsAsync(new Dictionary<string, bool>() { { "footer", true } });
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings), null, appFeaturesMock.Object);
        ApplicationMetadata expected = new("tdd/bestilling")
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
            OnEntry = new OnEntry() { Show = "select-instance" },
            Features = new Dictionary<string, bool>() { { "footer", true } },
            ExternalApiIds = [],
        };
        var actual = await appMetadata.GetApplicationMetadata();
        var actual2 = await appMetadata.GetApplicationMetadata();
        appFeaturesMock.Verify(af => af.GetFrontendFeatures());
        appFeaturesMock.VerifyAll();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);
        actual2.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetApplicationMetadata_onEntry_InstanceSelection_DefaultSelectedOption_read_legacy_value_if_new_not_set()
    {
        var featureManagerMock = new Mock<IFeatureManager>();
        FrontendFeatures frontendFeatures = new(featureManagerMock.Object);
        Dictionary<string, bool> enabledFrontendFeatures = await frontendFeatures.GetFrontendFeatures();

        AppSettings appSettings = GetAppSettings(
            "AppMetadata",
            "onentry-legacy-selectoptions.applicationmetadata.json"
        );
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        ApplicationMetadata expected = new("tdd/bestilling")
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
            OnEntry = new OnEntry()
            {
                Show = "select-instance",
                InstanceSelection = new()
                {
                    SortDirection = "desc",
                    RowsPerPageOptions = [5, 3, 10, 25, 50, 100],
                    DefaultRowsPerPage = 1,
                    DefaultSelectedOption = 1,
                },
            },
            Features = enabledFrontendFeatures,
            ExternalApiIds = [],
        };
        var actual = await appMetadata.GetApplicationMetadata();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);
        actual.OnEntry?.InstanceSelection?.DefaultSelectedOption.Should().Be(1);
    }

    [Fact]
    public async Task GetApplicationMetadata_onEntry_supports_new_option()
    {
        var featureManagerMock = new Mock<IFeatureManager>();
        IFrontendFeatures frontendFeatures = new FrontendFeatures(featureManagerMock.Object);
        Dictionary<string, bool> enabledFrontendFeatures = await frontendFeatures.GetFrontendFeatures();

        AppSettings appSettings = GetAppSettings("AppMetadata", "onentry-new-selectoptions.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        ApplicationMetadata expected = new ApplicationMetadata("tdd/bestilling")
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
            OnEntry = new OnEntry()
            {
                Show = "select-instance",
                InstanceSelection = new()
                {
                    SortDirection = "desc",
                    RowsPerPageOptions = [5, 3, 10, 25, 50, 100],
                    DefaultSelectedOption = 2,
                },
            },
            Features = enabledFrontendFeatures,
            ExternalApiIds = [],
        };
        var actual = await appMetadata.GetApplicationMetadata();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);
        actual.OnEntry?.InstanceSelection?.DefaultSelectedOption.Should().Be(2);
    }

    [Fact]
    public async Task GetApplicationMetadata_onEntry_prefer_new_option()
    {
        var featureManagerMock = new Mock<IFeatureManager>();
        IFrontendFeatures frontendFeatures = new FrontendFeatures(featureManagerMock.Object);
        Dictionary<string, bool> enabledFrontendFeatures = await frontendFeatures.GetFrontendFeatures();

        AppSettings appSettings = GetAppSettings(
            "AppMetadata",
            "onentry-prefer-new-selectoptions.applicationmetadata.json"
        );
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        ApplicationMetadata expected = new ApplicationMetadata("tdd/bestilling")
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
            OnEntry = new OnEntry()
            {
                Show = "select-instance",
                InstanceSelection = new()
                {
                    SortDirection = "desc",
                    RowsPerPageOptions = [5, 3, 10, 25, 50, 100],
                    DefaultRowsPerPage = 1,
                    DefaultSelectedOption = 3,
                },
            },
            Features = enabledFrontendFeatures,
            ExternalApiIds = [],
        };
        var actual = await appMetadata.GetApplicationMetadata();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);
        actual.OnEntry?.InstanceSelection?.DefaultSelectedOption.Should().Be(3);
    }

    [Fact]
    public async Task GetApplicationMetadata_logo_can_instantiate_with_source_and_DisplayAppOwnerNameInHeader()
    {
        var featureManagerMock = new Mock<IFeatureManager>();
        FrontendFeatures frontendFeatures = new(featureManagerMock.Object);
        Dictionary<string, bool> enabledFrontendFeatures = await frontendFeatures.GetFrontendFeatures();

        AppSettings appSettings = GetAppSettings("AppMetadata", "logo-org-source.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        ApplicationMetadata expected = new("tdd/bestilling")
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
            OnEntry = new OnEntry()
            {
                Show = "select-instance",
                InstanceSelection = new()
                {
                    SortDirection = "desc",
                    RowsPerPageOptions = [5, 3, 10, 25, 50, 100],
                    DefaultRowsPerPage = 1,
                    DefaultSelectedOption = 3,
                },
            },
            Logo = new Logo
            {
                Source = "org",
                DisplayAppOwnerNameInHeader = true,
                Size = "medium",
            },
            Features = enabledFrontendFeatures,
            ExternalApiIds = [],
        };
        var actual = await appMetadata.GetApplicationMetadata();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetApplicationMetadata_should_include_registered_externalApiIds()
    {
        string[] externalApiIds = ["api1", "api2"];
        AppSettings appSettings = GetAppSettings("AppMetadata", "default.applicationmetadata.json");
        var externalApiFactoryMock = new Mock<IExternalApiFactory>();
        externalApiFactoryMock.Setup(f => f.GetAllExternalApiIds()).Returns(externalApiIds);

        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings), externalApiFactoryMock.Object);

        var actual = await appMetadata.GetApplicationMetadata();
        actual.ExternalApiIds.Should().BeEquivalentTo(externalApiIds);
    }

    [Fact]
    public async Task GetApplicationMetadata_deserializes_unmapped_properties()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "unmapped-properties.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        var actual = await appMetadata.GetApplicationMetadata();
        actual.Should().NotBeNull();
        actual.UnmappedProperties.Should().NotBeNull();
        actual.UnmappedProperties!["foo"].Should().BeOfType<JsonElement>();
        ((JsonElement)actual.UnmappedProperties["foo"]).GetProperty("bar").GetString().Should().Be("baz");
    }

    [Fact]
    public async Task GetApplicationMetadata_deserialize_serialize_unmapped_properties()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "unmapped-properties.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        var appMetadataObj = await appMetadata.GetApplicationMetadata();
        string serialized = JsonSerializer.Serialize(appMetadataObj, _jsonSerializerOptions);
        serialized = serialized.Replace(
            ApplicationMetadata.LibVersion ?? throw new Exception("Couldn't get library version"),
            "--AltinnNugetVersion--"
        );

        await Verify(serialized);
    }

    [Fact]
    public async Task GetApplicationMetadata_throws_ApplicationConfigException_if_file_not_found()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "notfound.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        await Assert.ThrowsAsync<ApplicationConfigException>(appMetadata.GetApplicationMetadata);
    }

    [Fact]
    public async Task GetApplicationMetadata_throw_ApplicationConfigException_if_deserialization_fails()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "invalid.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        await Assert.ThrowsAsync<ApplicationConfigException>(appMetadata.GetApplicationMetadata);
    }

    [Fact]
    public async Task GetApplicationMetadata_throws_ApplicationConfigException_if_deserialization_fails_due_to_string_in_int()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "invalid-int.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        await Assert.ThrowsAsync<ApplicationConfigException>(appMetadata.GetApplicationMetadata);
    }

    [Fact]
    public async Task GetApplicationXACMLPolicy_return_policyfile_as_string()
    {
        AppSettings appSettings = GetAppSettings(subfolder: "AppPolicy", policyFilename: "policy.xml");
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        string expected = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + Environment.NewLine + "<root>policy</root>";
        var actual = await appMetadata.GetApplicationXACMLPolicy();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetApplicationXACMLPolicy_throws_FileNotFoundException_if_file_not_found()
    {
        AppSettings appSettings = GetAppSettings(subfolder: "AppPolicy", policyFilename: "notfound.xml");
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        await Assert.ThrowsAsync<FileNotFoundException>(appMetadata.GetApplicationXACMLPolicy);
    }

    [Fact]
    public async Task GetApplicationBPMNProcess_return_process_as_string()
    {
        AppSettings appSettings = GetAppSettings(subfolder: "AppProcess", bpmnFilename: "process.bpmn");
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        string expected = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + Environment.NewLine + "<root>process</root>";
        var actual = await appMetadata.GetApplicationBPMNProcess();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetApplicationBPMNProcess_throws_ApplicationConfigException_if_file_not_found()
    {
        AppSettings appSettings = GetAppSettings(subfolder: "AppProcess", policyFilename: "notfound.xml");
        IAppMetadata appMetadata = SetupAppMetadata(Options.Create(appSettings));
        await Assert.ThrowsAsync<ApplicationConfigException>(appMetadata.GetApplicationBPMNProcess);
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
        IExternalApiFactory? externalApiFactory = null,
        IFrontendFeatures? frontendFeatures = null,
        TelemetrySink? telemetrySink = null
    )
    {
        var featureManagerMock = new Mock<IFeatureManager>();

        if (externalApiFactory is null)
        {
            var _externalApiFactoryMock = new Mock<IExternalApiFactory>();
            _externalApiFactoryMock
                .Setup(f => f.GetExternalApiClient(It.IsAny<string>()))
                .Returns((IExternalApiClient?)null);
            _externalApiFactoryMock.Setup(f => f.GetAllExternalApiIds()).Returns([]);
            externalApiFactory = _externalApiFactoryMock.Object;
        }

        var serviceProvider = new Mock<IServiceProvider>();
        serviceProvider.Setup(s => s.GetService(typeof(IExternalApiFactory))).Returns(externalApiFactory);
        telemetrySink ??= new TelemetrySink();
        if (frontendFeatures == null)
        {
            return new AppMetadata(
                appsettings,
                new FrontendFeatures(featureManagerMock.Object),
                serviceProvider.Object,
                telemetrySink.Object
            );
        }

        return new AppMetadata(appsettings, frontendFeatures, serviceProvider.Object, telemetrySink.Object);
    }
}
