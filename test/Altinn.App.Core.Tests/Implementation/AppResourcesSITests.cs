using Altinn.App.Core.Configuration;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.FeatureManagement;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Implementation;

public class AppResourcesSITests
{
    private readonly string appBasePath = Path.Combine("Implementation", "TestData") + Path.DirectorySeparatorChar;

    [Fact]
    public void GetApplication_desrializes_file_from_disk()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "default.applicationmetadata.json");
        var settings = Microsoft.Extensions.Options.Options.Create<AppSettings>(appSettings);
        IAppMetadata appMetadata = SetupAppMedata(Microsoft.Extensions.Options.Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(settings, appMetadata, null, new NullLogger<AppResourcesSI>());
        Application expected = new Application()
        {
            Id = "tdd/bestilling",
            Org = "tdd",
            Created = DateTime.Parse("2019-09-16T22:22:22"),
            CreatedBy = "username",
            Title = new Dictionary<string, string>()
            {
                { "nb", "Bestillingseksempelapp" }
            },
            DataTypes = new List<DataType>()
            {
                new()
                {
                    Id = "vedlegg",
                    AllowedContentTypes = new List<string>() { "application/pdf", "image/png", "image/jpeg" },
                    MinCount = 0,
                    TaskId = "Task_1"
                },
                new()
                {
                    Id = "ref-data-as-pdf",
                    AllowedContentTypes = new List<string>() { "application/pdf" },
                    MinCount = 1,
                    TaskId = "Task_1"
                }
            },
            PartyTypesAllowed = new PartyTypesAllowed()
            {
                BankruptcyEstate = true,
                Organisation = true,
                Person = true,
                SubUnit = true
            },
            OnEntry = new OnEntry()
            {
                Show = "select-instance"
            }
        };
        var actual = appResources.GetApplication();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);
    }
    
    [Fact]
    public void GetApplication_handles_onEntry_null()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "no-on-entry.applicationmetadata.json");
        var settings = Microsoft.Extensions.Options.Options.Create<AppSettings>(appSettings);
        IAppMetadata appMetadata = SetupAppMedata(Microsoft.Extensions.Options.Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(settings, appMetadata, null, new NullLogger<AppResourcesSI>());
        Application expected = new Application()
        {
            Id = "tdd/bestilling",
            Org = "tdd",
            Created = DateTime.Parse("2019-09-16T22:22:22"),
            CreatedBy = "username",
            Title = new Dictionary<string, string>()
            {
                { "nb", "Bestillingseksempelapp" }
            },
            DataTypes = new List<DataType>()
            {
                new()
                {
                    Id = "vedlegg",
                    AllowedContentTypes = new List<string>() { "application/pdf", "image/png", "image/jpeg" },
                    MinCount = 0,
                    TaskId = "Task_1"
                },
                new()
                {
                    Id = "ref-data-as-pdf",
                    AllowedContentTypes = new List<string>() { "application/pdf" },
                    MinCount = 1,
                    TaskId = "Task_1"
                }
            },
            PartyTypesAllowed = new PartyTypesAllowed()
            {
                BankruptcyEstate = true,
                Organisation = true,
                Person = true,
                SubUnit = true
            }
        };
        var actual = appResources.GetApplication();
        actual.Should().NotBeNull();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void GetApplication_second_read_from_cache()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "default.applicationmetadata.json");
        Mock<IFrontendFeatures> appFeaturesMock = new Mock<IFrontendFeatures>();
        appFeaturesMock.Setup(af => af.GetFrontendFeatures()).ReturnsAsync(new Dictionary<string, bool>() { { "footer", true } });
        var settings = Microsoft.Extensions.Options.Options.Create<AppSettings>(appSettings);
        IAppMetadata appMetadata = SetupAppMedata(Microsoft.Extensions.Options.Options.Create(appSettings), appFeaturesMock.Object);
        IAppResources appResources = new AppResourcesSI(settings, appMetadata, null, new NullLogger<AppResourcesSI>());
        Application expected = new Application()
        {
            Id = "tdd/bestilling",
            Org = "tdd",
            Created = DateTime.Parse("2019-09-16T22:22:22"),
            CreatedBy = "username",
            Title = new Dictionary<string, string>()
            {
                { "nb", "Bestillingseksempelapp" }
            },
            DataTypes = new List<DataType>()
            {
                new()
                {
                    Id = "vedlegg",
                    AllowedContentTypes = new List<string>() { "application/pdf", "image/png", "image/jpeg" },
                    MinCount = 0,
                    TaskId = "Task_1"
                },
                new()
                {
                    Id = "ref-data-as-pdf",
                    AllowedContentTypes = new List<string>() { "application/pdf" },
                    MinCount = 1,
                    TaskId = "Task_1"
                }
            },
            PartyTypesAllowed = new PartyTypesAllowed()
            {
                BankruptcyEstate = true,
                Organisation = true,
                Person = true,
                SubUnit = true
            },
            OnEntry = new OnEntry()
            {
                Show = "select-instance"
            },
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
        var settings = Microsoft.Extensions.Options.Options.Create<AppSettings>(appSettings);
        IAppMetadata appMetadata = SetupAppMedata(Microsoft.Extensions.Options.Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(settings, appMetadata, null, new NullLogger<AppResourcesSI>());
        Assert.Throws<ApplicationConfigException>(() => appResources.GetApplication());
    }

    [Fact]
    public void GetApplicationMetadata_throws_ApplicationConfigException_if_deserialization_fails()
    {
        AppSettings appSettings = GetAppSettings("AppMetadata", "invalid.applicationmetadata.json");
        var settings = Microsoft.Extensions.Options.Options.Create<AppSettings>(appSettings);
        IAppMetadata appMetadata = SetupAppMedata(Microsoft.Extensions.Options.Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(settings, appMetadata, null, new NullLogger<AppResourcesSI>());
        Assert.Throws<ApplicationConfigException>(() => appResources.GetApplication());
    }

    [Fact]
    public void GetApplicationXACMLPolicy_return_policyfile_as_string()
    {
        AppSettings appSettings = GetAppSettings(subfolder: "AppPolicy", policyFilename: "policy.xml");
        var settings = Microsoft.Extensions.Options.Options.Create<AppSettings>(appSettings);
        IAppMetadata appMetadata = SetupAppMedata(Microsoft.Extensions.Options.Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(settings, appMetadata, null, new NullLogger<AppResourcesSI>());
        string expected = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + Environment.NewLine + "<root>policy</root>";
        var actual = appResources.GetApplicationXACMLPolicy();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void GetApplicationXACMLPolicy_return_null_if_file_not_found()
    {
        AppSettings appSettings = GetAppSettings(subfolder: "AppPolicy", policyFilename: "notfound.xml");
        var settings = Microsoft.Extensions.Options.Options.Create<AppSettings>(appSettings);
        IAppMetadata appMetadata = SetupAppMedata(Microsoft.Extensions.Options.Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(settings, appMetadata, null, new NullLogger<AppResourcesSI>());
        var actual = appResources.GetApplicationXACMLPolicy();
        actual.Should().BeNull();
    }

    [Fact]
    public void GetApplicationBPMNProcess_return_process_as_string()
    {
        AppSettings appSettings = GetAppSettings(subfolder: "AppProcess", bpmnFilename: "process.bpmn");
        var settings = Microsoft.Extensions.Options.Options.Create<AppSettings>(appSettings);
        IAppMetadata appMetadata = SetupAppMedata(Microsoft.Extensions.Options.Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(settings, appMetadata, null, new NullLogger<AppResourcesSI>());
        string expected = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + Environment.NewLine + "<root>process</root>";
        var actual = appResources.GetApplicationBPMNProcess();
        actual.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void GetApplicationBPMNProcess_return_null_if_file_not_found()
    {
        AppSettings appSettings = GetAppSettings(subfolder: "AppProcess", policyFilename: "notfound.xml");
        var settings = Microsoft.Extensions.Options.Options.Create<AppSettings>(appSettings);
        IAppMetadata appMetadata = SetupAppMedata(Microsoft.Extensions.Options.Options.Create(appSettings));
        IAppResources appResources = new AppResourcesSI(settings, appMetadata, null, new NullLogger<AppResourcesSI>());
        var actual = appResources.GetApplicationBPMNProcess();
        actual.Should().BeNull();
    }

    private AppSettings GetAppSettings(string subfolder, string appMetadataFilename = "", string bpmnFilename = "", string policyFilename = "")
    {
        AppSettings appSettings = new AppSettings()
        {
            AppBasePath = appBasePath,
            ConfigurationFolder = subfolder + Path.DirectorySeparatorChar,
            AuthorizationFolder = string.Empty,
            ProcessFolder = string.Empty,
            ApplicationMetadataFileName = appMetadataFilename,
            ProcessFileName = bpmnFilename,
            ApplicationXACMLPolicyFileName = policyFilename
        };
        return appSettings;
    }

    private static IAppMetadata SetupAppMedata(IOptions<AppSettings> appsettings, IFrontendFeatures frontendFeatures = null)
    {
        var featureManagerMock = new Mock<IFeatureManager>();

        if (frontendFeatures == null)
        {
            return new AppMetadata(appsettings, new FrontendFeatures(featureManagerMock.Object));
        }

        return new AppMetadata(appsettings, frontendFeatures);
    }
}
