#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Infrastructure.GitRepository
{
    public class AltinnAppGitRepositoryTests : IDisposable
    {
        private string TargetRepoName { get; set; }

        [Fact]
        public void Constructor_ValidParameters_ShouldInstantiate()
        {
            string org = "ttd";
            string repository = "hvem-er-hvem";
            string developer = "testUser";

            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);
            var altinnAppGitRepository = new AltinnAppGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory);

            Assert.Equal(org, altinnAppGitRepository.Org);
            Assert.Equal(repository, altinnAppGitRepository.Repository);
            Assert.Equal(developer, altinnAppGitRepository.Developer);
            Assert.Contains(repositoriesRootDirectory, altinnAppGitRepository.RepositoriesRootDirectory);
        }

        [Fact]
        public async Task GetApplicationMetadata_FileExists_ShouldHaveCorrectValues()
        {
            string org = "ttd";
            string repository = "hvem-er-hvem";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            ApplicationMetadata applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();

            Assert.Equal("yabbin/hvem-er-hvem", applicationMetadata.Id);
            Assert.Equal("yabbin", applicationMetadata.Org);
            Assert.Contains("Hvem er hvem?", applicationMetadata.Title.Values);
            Assert.Contains("who-is-who", applicationMetadata.Title.Values);
            Assert.Contains("nb", applicationMetadata.Title.Keys);
            Assert.Contains("en", applicationMetadata.Title.Keys);

            Assert.Equal(2, applicationMetadata.DataTypes.Count);
            Assert.Equal("application/pdf", applicationMetadata.DataTypes.First(d => d.Id == "ref-data-as-pdf").AllowedContentTypes.First());

            DataType mainDataType = applicationMetadata.DataTypes.First(d => d.Id == "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES");
            Assert.Equal("application/xml", mainDataType.AllowedContentTypes.First());
            Assert.Equal("Altinn.App.Models.HvemErHvem_M", mainDataType.AppLogic.ClassRef);
            Assert.True(mainDataType.AppLogic.AutoCreate);
            Assert.Equal(1, mainDataType.MinCount);
            Assert.Equal(1, mainDataType.MaxCount);
            Assert.Equal("Task_1", mainDataType.TaskId);

            Assert.False(applicationMetadata.PartyTypesAllowed.Person);
            Assert.False(applicationMetadata.PartyTypesAllowed.Organisation);
            Assert.False(applicationMetadata.PartyTypesAllowed.SubUnit);
            Assert.False(applicationMetadata.PartyTypesAllowed.BankruptcyEstate);

            DataField dataField = applicationMetadata.DataFields.First(d => d.Id == "GeekType");
            Assert.Equal("InnrapporterteData.geekType", dataField.Path);
            Assert.Equal("Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES", dataField.DataTypeId);

            Assert.False(applicationMetadata.AutoDeleteOnProcessEnd);
            Assert.Equal(DateTime.Parse("2021-04-08T17:42:09.0883842Z").ToUniversalTime(), applicationMetadata.Created);
            Assert.Equal("Ronny", applicationMetadata.CreatedBy);
            Assert.Equal(DateTime.Parse("2021-04-08T17:42:09.08847Z").ToUniversalTime(), applicationMetadata.LastChanged);
            Assert.Equal("Ronny", applicationMetadata.LastChangedBy);
        }

        [Fact]
        public async Task GetTextResources_ResourceExists_ShouldReturn()
        {
            string org = "ttd";
            string repository = "hvem-er-hvem";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            var textResource = await altinnAppGitRepository.GetText("nb");

            Assert.NotNull(textResource);
            Assert.Equal("Hvem er hvem?", textResource.Resources.First(r => r.Id == "ServiceName").Value);
        }

        [Fact]
        public void GetLanguages_NotOnlyResourceFilesInTextsFolder_ShouldReturnCorrectLanguagesSorted()
        {
            string org = "ttd";
            string repository = "hvem-er-hvem";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            var languages = altinnAppGitRepository.GetLanguages();

            Assert.NotNull(languages);
            Assert.Equal(2, languages.Count());
            Assert.Equal("en", languages.First());
            Assert.Equal("nb", languages.Last());
        }

        [Fact]
        public void GetLayoutSetNames_WithAppThatUsesLayoutSet_ShouldReturnLayoutSetNames()
        {
            string org = "ttd";
            string repository = "app-with-layoutsets";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            string[] layoutSetNames = altinnAppGitRepository.GetLayoutSetNames();

            Assert.NotNull(layoutSetNames);
            Assert.Equal(2, layoutSetNames.Length);
        }

        [Fact]
        public void GetLayoutSetNames_WithAppThatNotUsesLayoutSet_ShouldReturnDefaultLayoutFolder()
        {
            string org = "ttd";
            string repository = "app-without-layoutsets";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            string[] layoutSetNames = altinnAppGitRepository.GetLayoutSetNames();

            Assert.NotNull(layoutSetNames);
            Assert.Single(layoutSetNames);
        }

        [Fact]
        public Task CheckIfAppUsesLayoutSets_ShouldReturnTrue()
        {
            string org = "ttd";
            string repository = "app-with-layoutsets";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();

            Assert.True(appUsesLayoutSets);
            return Task.CompletedTask;
        }

        [Fact]
        public Task CheckIfAppUsesLayoutSets_ShouldReturnFalse()
        {
            string org = "ttd";
            string repository = "app-without-layoutsets";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();

            Assert.False(appUsesLayoutSets);
            return Task.CompletedTask;
        }

        [Fact]
        public Task GetLayoutNames_WithAppThatUsesLayoutSet_ShouldReturnLayoutPathNames()
        {
            string org = "ttd";
            string repository = "app-with-layoutsets";
            string developer = "testUser";
            string layoutSetName = "layoutSet1";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            string[] layoutNames = altinnAppGitRepository.GetLayoutNames(layoutSetName);

            Assert.NotNull(layoutSetName);
            Assert.Equal(2, layoutNames.Length);
            return Task.CompletedTask;
        }

        [Fact]
        public Task GetLayoutNames_WithAppThatNotUsesLayoutSet_ShouldReturnLayoutPathNames()
        {
            string org = "ttd";
            string repository = "app-without-layoutsets";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            string[] layoutNames = altinnAppGitRepository.GetLayoutNames(null);

            Assert.NotNull(layoutNames);
            Assert.Equal(2, layoutNames.Length);
            return Task.CompletedTask;
        }

        [Fact]
        public async Task GetLayout_WithAppThatUsesLayoutSet_ShouldReturnLayout()
        {
            string org = "ttd";
            string repository = "app-with-layoutsets";
            string developer = "testUser";
            string layoutSetName = "layoutSet1";
            string layoutName = "layoutFile1InSet1";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            JsonNode formLayout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);

            Assert.NotNull(formLayout);
            Assert.NotNull(formLayout["data"]);
            Assert.NotNull(formLayout["data"]["layout"]);
        }

        [Fact]
        public async Task GetLayout_WithAppThatNotUsesLayoutSet_ShouldReturnLayout()
        {
            string org = "ttd";
            string repository = "app-without-layoutsets";
            string developer = "testUser";
            string layoutName = "layoutFile1";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            JsonNode formLayout = await altinnAppGitRepository.GetLayout(null, layoutName);

            Assert.NotNull(formLayout);
            Assert.NotNull(formLayout["data"]);
            Assert.NotNull(formLayout["data"]["layout"]);
        }

        [Fact]
        public async Task SaveLayout_ShouldUpdateLayoutInApp()
        {
            string org = "ttd";
            string repository = "app-with-layoutsets";
            string developer = "testUser";
            string layoutSetName = "layoutSet1";
            string layoutName = "layoutFile2InSet1";
            string targetRepository = TestDataHelper.GenerateTestRepoName();

            TargetRepoName = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, targetRepository, developer);

            var formLayoutToSave = JsonNode.Parse("{\"$schema\":\"some-string\",\"data\":{\"layout\":[{\"id\":\"some-id\",\"type\":\"some-type\"}]}}");
            await altinnAppGitRepository.SaveLayout(layoutSetName, layoutName, formLayoutToSave);
            JsonNode formLayoutSaved = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);

            Assert.NotNull(formLayoutSaved);
            Assert.NotNull(formLayoutSaved["data"]);
            Assert.NotNull(formLayoutSaved["data"]["layout"]);
            Assert.Single(formLayoutSaved["data"]["layout"] as JsonArray);
        }

        [Fact]
        public async Task GetOptions_WithAppThatHasOptions_ShouldReturnSpecificOptionsList()
        {
            string org = "ttd";
            string repository = "app-with-options";
            string developer = "testUser";
            string optionsId = "test-options";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            string options = await altinnAppGitRepository.GetOptionsList(optionsId);

            Assert.NotNull(options);
            var optionsArray = JsonNode.Parse(options).AsArray();
            Assert.Equal(2, optionsArray.Count);
            Assert.Equal("label1", optionsArray[0]["label"].ToString());
            Assert.Equal("label2", optionsArray[1]["label"].ToString());
        }

        [Fact]
        public async Task GetOptions_WhenSpecifiedOptionIdDoesNotExistInApp_ShouldThrowNotFoundException()
        {
            string org = "ttd";
            string repository = "app-with-options";
            string developer = "testUser";
            string optionsId = "non-existing-test-options";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            await Assert.ThrowsAsync<LibGit2Sharp.NotFoundException>(async () => await altinnAppGitRepository.GetOptionsList(optionsId));
        }

        [Fact]
        public Task GetOptionListIds_WithAppThatHasOptionLists_ShouldReturnOptionListPathNames()
        {
            string org = "ttd";
            string repository = "app-with-options";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            string[] optionListIds = altinnAppGitRepository.GetOptionsListIds();

            Assert.NotNull(optionListIds);
            Assert.Equal(3, optionListIds.Length);
            return Task.CompletedTask;
        }

        [Fact]
        public void GetOptionListIds_WithAppThatHasNoOptionLists_ShouldReturnEmptyList()
        {
            string org = "ttd";
            string repository = "empty-app";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);
            var optionsIds = altinnAppGitRepository.GetOptionsListIds();
            Assert.Equal([], optionsIds);
        }

        [Fact]
        public async Task CreateOrOverwriteOptions_WithAppThatHasNoOptionLists_ShouldCreateOptions()
        {
            // Arrange
            string org = "ttd";
            string repository = "empty-app";
            string developer = "testUser";
            string newOptionName = "new-options";
            string targetRepository = TestDataHelper.GenerateTestRepoName();

            TargetRepoName = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, targetRepository, developer);

            var newOptionsList = new List<Option>
            {
                new Option
                {
                    Label = "label1",
                    Value = "value1",
                },
                new Option
                {
                    Label = "label2",
                    Value = "value2",
                }
            };
            var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
            string newOptionsListString = JsonSerializer.Serialize(newOptionsList, jsonOptions);

            // Act
            string savedOptionsList = await altinnAppGitRepository.CreateOrOverwriteOptionsList(newOptionName, newOptionsList);

            // Assert
            Assert.Equal(newOptionsListString, savedOptionsList);
        }

        [Fact]
        public async Task CreateOrOverwriteOptions_WithAppThatHasOptionLists_ShouldOverwriteOptions()
        {
            // Arrange
            string org = "ttd";
            string repository = "app-with-options";
            string developer = "testUser";
            string newOptionName = "test-options"; // these options already exist in this repo
            string targetRepository = TestDataHelper.GenerateTestRepoName();

            TargetRepoName = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, targetRepository, developer);

            var newOptionsList = new List<Option>
            {
                new Option
                {
                    Label = "label1",
                    Value = "newValue1",
                },
                new Option
                {
                    Label = "label2",
                    Value = "newValue2",
                }
            };
            var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
            string newOptionsListString = JsonSerializer.Serialize(newOptionsList, jsonOptions);

            // Act
            string savedOptionsList = await altinnAppGitRepository.CreateOrOverwriteOptionsList(newOptionName, newOptionsList);

            // Assert
            Assert.Equal(newOptionsListString, savedOptionsList);
        }

        [Theory]
        [InlineData("ttd", "apps-test", "testUser", 0)]
        [InlineData("ttd", "ttd-datamodels", "testUser", 0)]
        [InlineData("ttd", "hvem-er-hvem", "testUser", 7)]
        public async Task GetSchemaFiles_FilesExist_ShouldReturnFiles(string org, string repository, string developer, int expectedSchemaFiles)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            TargetRepoName = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, targetRepository, developer);

            var files = altinnAppGitRepository.GetSchemaFiles();

            Assert.Equal(expectedSchemaFiles, files.Count);
        }

        [Fact]
        public async Task GetSchemaFiles_FilesExist_ShouldReturnFilesWithCorrectProperties()
        {
            string org = "ttd";
            string repository = "hvem-er-hvem";
            string developer = "testUser";
            string targetRepository = TestDataHelper.GenerateTestRepoName();

            TargetRepoName = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, targetRepository, developer);

            var file = altinnAppGitRepository.GetSchemaFiles().First(f => f.FileName == "HvemErHvem_ExternalTypes.schema.json");

            Assert.Equal(".json", file.FileType);
            Assert.Equal(@"/App/models/HvemErHvem_ExternalTypes.schema.json", file.RepositoryRelativeUrl);
        }

        [Fact]
        public async Task GetSchemaFiles_FilesExistOutsideModelsFolder_ShouldNotReturnFiles()
        {
            string org = "ttd";
            string repository = "app-with-misplaced-datamodels";
            string developer = "testUser";
            string targetRepository = TestDataHelper.GenerateTestRepoName();

            TargetRepoName = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, targetRepository, developer);

            var files = altinnAppGitRepository.GetSchemaFiles();

            Assert.Empty(files);
        }

        private static AltinnAppGitRepository PrepareRepositoryForTest(string org, string repository, string developer)
        {

            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);
            var altinnAppGitRepository = new AltinnAppGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory);

            return altinnAppGitRepository;
        }

        public void Dispose()
        {
            if (!string.IsNullOrEmpty(TargetRepoName))
            {
                TestDataHelper.DeleteDirectory(TargetRepoName);
            }
        }
    }
}
