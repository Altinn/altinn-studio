using System.Text.Encodings.Web;
using System.Text.Json;
using Altinn.App.Core.Features.ExternalApi;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
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
        Dictionary<string, bool> enabledFrontendFeatures = [];

        AppFiles appFiles = GetAppFiles("AppMetadata", "default.applicationmetadata.json");

        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
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
    }

    [Fact]
    public async Task GetApplicationMetadata_second_read_from_cache()
    {
        AppFiles appFiles = GetAppFiles("AppMetadata", "default.applicationmetadata.json");
        Mock<IFrontendFeatures> appFeaturesMock = new();
        appFeaturesMock.Setup(af => af.GetDictionary()).Returns(new Dictionary<string, bool>() { { "footer", true } });
        IAppMetadata appMetadata = SetupAppMetadata(appFiles, null, appFeaturesMock.Object);
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
        appFeaturesMock.Verify(af => af.GetDictionary());
        appFeaturesMock.VerifyAll();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);
        actual2.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetApplicationMetadata_keeps_the_cache_for_equal_flags_and_rebuilds_when_a_flag_changes()
    {
        AppFiles appFiles = GetAppFiles("AppMetadata", "default.applicationmetadata.json");
        var flags = new Dictionary<string, bool> { ["footer"] = true };
        var frontendFeatures = new Mock<IFrontendFeatures>();
        // A new dictionary on every read, as an app's own IFrontendFeatures might return
        frontendFeatures.Setup(f => f.GetDictionary()).Returns(() => new Dictionary<string, bool>(flags));
        IAppMetadata appMetadata = SetupAppMetadata(appFiles, null, frontendFeatures.Object);

        var first = await appMetadata.GetApplicationMetadata();
        Assert.Same(first, await appMetadata.GetApplicationMetadata());
        Assert.True(first.Features!["footer"]);

        flags["footer"] = false;
        var second = await appMetadata.GetApplicationMetadata();
        Assert.NotSame(first, second);
        Assert.False(second.Features!["footer"]);
    }

    [Fact]
    public async Task GetApplicationMetadata_onEntry_InstanceSelection_DefaultSelectedOption_read_legacy_value_if_new_not_set()
    {
        Dictionary<string, bool> enabledFrontendFeatures = [];

        AppFiles appFiles = GetAppFiles("AppMetadata", "onentry-legacy-selectoptions.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
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
        Dictionary<string, bool> enabledFrontendFeatures = [];

        AppFiles appFiles = GetAppFiles("AppMetadata", "onentry-new-selectoptions.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
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
        Dictionary<string, bool> enabledFrontendFeatures = [];

        AppFiles appFiles = GetAppFiles("AppMetadata", "onentry-prefer-new-selectoptions.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
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
        Dictionary<string, bool> enabledFrontendFeatures = [];

        AppFiles appFiles = GetAppFiles("AppMetadata", "logo-org-source.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
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
        AppFiles appFiles = GetAppFiles("AppMetadata", "default.applicationmetadata.json");
        var externalApiFactoryMock = new Mock<IExternalApiFactory>();
        externalApiFactoryMock.Setup(f => f.GetAllExternalApiIds()).Returns(externalApiIds);

        IAppMetadata appMetadata = SetupAppMetadata(appFiles, externalApiFactoryMock.Object);

        var actual = await appMetadata.GetApplicationMetadata();
        actual.ExternalApiIds.Should().BeEquivalentTo(externalApiIds);
    }

    [Fact]
    public async Task GetApplicationMetadata_deserializes_unmapped_properties()
    {
        AppFiles appFiles = GetAppFiles("AppMetadata", "unmapped-properties.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
        var actual = await appMetadata.GetApplicationMetadata();
        actual.Should().NotBeNull();
        actual.UnmappedProperties.Should().NotBeNull();
        actual.UnmappedProperties!["foo"].Should().BeOfType<JsonElement>();
        ((JsonElement)actual.UnmappedProperties["foo"]).GetProperty("bar").GetString().Should().Be("baz");
    }

    [Fact]
    public async Task GetApplicationMetadata_deserialize_serialize_unmapped_properties()
    {
        AppFiles appFiles = GetAppFiles("AppMetadata", "unmapped-properties.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
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
        AppFiles appFiles = GetAppFiles("AppMetadata", "notfound.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
        await Assert.ThrowsAsync<ApplicationConfigException>(appMetadata.GetApplicationMetadata);
    }

    [Fact]
    public async Task GetApplicationMetadata_throw_ApplicationConfigException_if_deserialization_fails()
    {
        AppFiles appFiles = GetAppFiles("AppMetadata", "invalid.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
        await Assert.ThrowsAsync<ApplicationConfigException>(appMetadata.GetApplicationMetadata);
    }

    [Fact]
    public async Task GetApplicationMetadata_throws_ApplicationConfigException_if_deserialization_fails_due_to_string_in_int()
    {
        AppFiles appFiles = GetAppFiles("AppMetadata", "invalid-int.applicationmetadata.json");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
        await Assert.ThrowsAsync<ApplicationConfigException>(appMetadata.GetApplicationMetadata);
    }

    [Fact]
    public async Task GetApplicationXACMLPolicy_return_policyfile_as_string()
    {
        AppFiles appFiles = GetAppFiles(subfolder: "AppPolicy", policyFilename: "policy.xml");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
        string expected = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + Environment.NewLine + "<root>policy</root>";
        var actual = await appMetadata.GetApplicationXACMLPolicy();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetApplicationXACMLPolicy_throws_FileNotFoundException_if_file_not_found()
    {
        AppFiles appFiles = GetAppFiles(subfolder: "AppPolicy", policyFilename: "notfound.xml");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
        await Assert.ThrowsAsync<FileNotFoundException>(appMetadata.GetApplicationXACMLPolicy);
    }

    [Fact]
    public async Task GetApplicationBPMNProcess_return_process_as_string()
    {
        AppFiles appFiles = GetAppFiles(subfolder: "AppProcess", bpmnFilename: "process.bpmn");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
        string expected = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + Environment.NewLine + "<root>process</root>";
        var actual = await appMetadata.GetApplicationBPMNProcess();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task GetApplicationBPMNProcess_throws_ApplicationConfigException_if_file_not_found()
    {
        AppFiles appFiles = GetAppFiles(subfolder: "AppProcess", policyFilename: "notfound.xml");
        IAppMetadata appMetadata = SetupAppMetadata(appFiles);
        await Assert.ThrowsAsync<ApplicationConfigException>(appMetadata.GetApplicationBPMNProcess);
    }

    /// <summary>
    /// The app files with the given test data files from a sub folder of TestData, or without the ones not given.
    /// </summary>
    private AppFiles GetAppFiles(
        string subfolder,
        string appMetadataFilename = "",
        string bpmnFilename = "",
        string policyFilename = ""
    )
    {
        return new AppFiles(Read(appMetadataFilename), Read(policyFilename), Read(bpmnFilename));

        ReadOnlyMemory<byte>? Read(string fileName)
        {
            string path = Path.Join(_appBasePath, subfolder, fileName);
            if (fileName.Length == 0 || !File.Exists(path))
            {
                return null;
            }

            // Without the byte order mark, as AppFilesLoader does
            byte[] bytes = File.ReadAllBytes(path);
            return bytes.AsSpan().StartsWith((byte[])[0xEF, 0xBB, 0xBF]) ? bytes.AsMemory(3) : bytes;
        }
    }

    private static IAppMetadata SetupAppMetadata(
        AppFiles files,
        IExternalApiFactory? externalApiFactory = null,
        IFrontendFeatures? frontendFeatures = null
    )
    {
        if (externalApiFactory is null)
        {
            var _externalApiFactoryMock = new Mock<IExternalApiFactory>();
            _externalApiFactoryMock
                .Setup(f => f.GetExternalApiClient(It.IsAny<string>()))
                .Returns((IExternalApiClient?)null);
            _externalApiFactoryMock.Setup(f => f.GetAllExternalApiIds()).Returns([]);
            externalApiFactory = _externalApiFactoryMock.Object;
        }

        var appFiles = new AppFilesAccessor(files);
        var serviceProvider = new Mock<IServiceProvider>();
        serviceProvider.Setup(s => s.GetService(typeof(IExternalApiFactory))).Returns(externalApiFactory);
        return new AppMetadata(
            appFiles,
            frontendFeatures ?? new FrontendFeatures(new ConfigurationBuilder().Build()),
            serviceProvider.Object
        );
    }
}
