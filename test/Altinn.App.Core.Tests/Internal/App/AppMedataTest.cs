using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.App
{
    public class AppMedataTest
    {
        private readonly string appBasePath = Path.Combine("Internal", "App", "TestData") + Path.DirectorySeparatorChar;

        [Fact]
        public async void GetApplicationMetadata_desrializes_file_from_disk()
        {
            AppSettings appSettings = GetAppSettings("AppMetadata", "default.applicationmetadata.json");
            IAppMetadata appMetadata = SetupAppMedata(Options.Create(appSettings));
            ApplicationMetadata expected = new ApplicationMetadata("tdd/bestilling")
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
                OnEntry = new OnEntryConfig()
                {
                    Show = "select-instance"
                },
                Features = new Dictionary<string, bool>()
                {
                    { "footer", true },
                    { "processActions", true }
                }
            };
            var actual = await appMetadata.GetApplicationMetadata();
            actual.Should().NotBeNull();
            actual.Should().BeEquivalentTo(expected);
        }

        [Fact]
        public async void GetApplicationMetadata_eformidling_desrializes_file_from_disk()
        {
            AppSettings appSettings = GetAppSettings("AppMetadata", "eformid.applicationmetadata.json");
            IAppMetadata appMetadata = SetupAppMedata(Options.Create(appSettings));
            ApplicationMetadata expected = new ApplicationMetadata("tdd/bestilling")
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
                    DataTypes = new List<string>()
                    {
                        "372c7af5-71e1-4e99-8e05-4716711a8b53",
                    }
                },
                OnEntry = new OnEntryConfig()
                {
                    Show = "select-instance"
                },
                Features = new Dictionary<string, bool>()
                {
                    { "footer", true },
                    { "processActions", true }
                }
            };
            var actual = await appMetadata.GetApplicationMetadata();
            actual.Should().NotBeNull();
            actual.Should().BeEquivalentTo(expected);
        }

        [Fact]
        public async void GetApplicationMetadata_second_read_from_cache()
        {
            AppSettings appSettings = GetAppSettings("AppMetadata", "default.applicationmetadata.json");
            Mock<IFrontendFeatures> appFeaturesMock = new Mock<IFrontendFeatures>();
            appFeaturesMock.Setup(af => af.GetFrontendFeatures()).ReturnsAsync(new Dictionary<string, bool>() { { "footer", true } });
            IAppMetadata appMetadata = SetupAppMedata(Options.Create(appSettings), appFeaturesMock.Object);
            ApplicationMetadata expected = new ApplicationMetadata("tdd/bestilling")
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
                OnEntry = new OnEntryConfig()
                {
                    Show = "select-instance"
                },
                Features = new Dictionary<string, bool>()
                {
                    { "footer", true }
                }
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
        public async void GetApplicationMetadata_throws_ApplicationConfigException_if_file_not_found()
        {
            AppSettings appSettings = GetAppSettings("AppMetadata", "notfound.applicationmetadata.json");
            IAppMetadata appMetadata = SetupAppMedata(Options.Create(appSettings));
            await Assert.ThrowsAsync<ApplicationConfigException>(async () => await appMetadata.GetApplicationMetadata());
        }

        [Fact]
        public async void GetApplicationMetadata_throw_ApplicationConfigException_if_deserialization_fails()
        {
            AppSettings appSettings = GetAppSettings("AppMetadata", "invalid.applicationmetadata.json");
            IAppMetadata appMetadata = SetupAppMedata(Options.Create(appSettings));
            await Assert.ThrowsAsync<ApplicationConfigException>(async () => await appMetadata.GetApplicationMetadata());
        }

        [Fact]
        public async void GetApplicationMetadata_throws_ApplicationConfigException_if_deserialization_fails_due_to_string_in_int()
        {
            AppSettings appSettings = GetAppSettings("AppMetadata", "invalid-int.applicationmetadata.json");
            IAppMetadata appMetadata = SetupAppMedata(Options.Create(appSettings));
            await Assert.ThrowsAsync<ApplicationConfigException>(async () => await appMetadata.GetApplicationMetadata());
        }

        [Fact]
        public async void GetApplicationXACMLPolicy_return_policyfile_as_string()
        {
            AppSettings appSettings = GetAppSettings(subfolder: "AppPolicy", policyFilename: "policy.xml");
            IAppMetadata appMetadata = SetupAppMedata(Options.Create(appSettings));
            string expected = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + Environment.NewLine + "<root>policy</root>";
            var actual = await appMetadata.GetApplicationXACMLPolicy();
            actual.Should().BeEquivalentTo(expected);
        }

        [Fact]
        public async void GetApplicationXACMLPolicy_throws_FileNotFoundException_if_file_not_found()
        {
            AppSettings appSettings = GetAppSettings(subfolder: "AppPolicy", policyFilename: "notfound.xml");
            IAppMetadata appMetadata = SetupAppMedata(Options.Create(appSettings));
            await Assert.ThrowsAsync<FileNotFoundException>(async () => await appMetadata.GetApplicationXACMLPolicy());
        }

        [Fact]
        public async void GetApplicationBPMNProcess_return_process_as_string()
        {
            AppSettings appSettings = GetAppSettings(subfolder: "AppProcess", bpmnFilename: "process.bpmn");
            IAppMetadata appMetadata = SetupAppMedata(Options.Create(appSettings));
            string expected = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + Environment.NewLine + "<root>process</root>";
            var actual = await appMetadata.GetApplicationBPMNProcess();
            actual.Should().BeEquivalentTo(expected);
        }

        [Fact]
        public async void GetApplicationBPMNProcess_throws_ApplicationConfigException_if_file_not_found()
        {
            AppSettings appSettings = GetAppSettings(subfolder: "AppProcess", policyFilename: "notfound.xml");
            IAppMetadata appMetadata = SetupAppMedata(Options.Create(appSettings));
            await Assert.ThrowsAsync<ApplicationConfigException>(async () => await appMetadata.GetApplicationBPMNProcess());
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
            if (frontendFeatures == null)
            {
                return new AppMetadata(appsettings, new FrontendFeatures());
            }
            
            return new AppMetadata(appsettings, frontendFeatures);
        }
    }
}
