using System;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Designer.Tests.Utils;
using FluentAssertions;
using Xunit;

namespace Designer.Tests.Infrastructure.GitRepository
{
    public class AltinnAppGitRepositoryTests
    {
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

            applicationMetadata.Id.Should().Be("yabbin/hvem-er-hvem");
            applicationMetadata.Org.Should().Be("yabbin");
            applicationMetadata.Title.Should().ContainValues("Hvem er hvem?", "who-is-who");
            applicationMetadata.Title.Should().ContainKeys("nb", "en");

            applicationMetadata.DataTypes.Should().HaveCount(2);
            applicationMetadata.DataTypes.First(d => d.Id == "ref-data-as-pdf").AllowedContentTypes.First().Should().Be("application/pdf");

            DataType mainDataType = applicationMetadata.DataTypes.First(d => d.Id == "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES");
            mainDataType.AllowedContentTypes.First().Should().Be("application/xml");
            mainDataType.AppLogic.ClassRef.Should().Be("Altinn.App.Models.HvemErHvem_M");
            mainDataType.AppLogic.AutoCreate.Should().BeTrue();
            mainDataType.MinCount.Should().Be(1);
            mainDataType.MaxCount.Should().Be(1);
            mainDataType.TaskId.Should().Be("Task_1");

            applicationMetadata.PartyTypesAllowed.Person.Should().BeFalse();
            applicationMetadata.PartyTypesAllowed.Organisation.Should().BeFalse();
            applicationMetadata.PartyTypesAllowed.SubUnit.Should().BeFalse();
            applicationMetadata.PartyTypesAllowed.BankruptcyEstate.Should().BeFalse();

            DataField dataField = applicationMetadata.DataFields.First(d => d.Id == "GeekType");
            dataField.Path.Should().Be("InnrapporterteData.geekType");
            dataField.DataTypeId.Should().Be("Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES");

            applicationMetadata.AutoDeleteOnProcessEnd.Should().BeFalse();
            applicationMetadata.Created.Should().BeSameDateAs(DateTime.Parse("2021-04-08T17:42:09.0883842Z"));
            applicationMetadata.CreatedBy.Should().Be("Ronny");
            applicationMetadata.LastChanged.Should().BeSameDateAs(DateTime.Parse("2021-04-08T17:42:09.08847Z"));
            applicationMetadata.LastChangedBy.Should().Be("Ronny");
        }

        [Fact]
        public async Task GetTextResources_ResourceExists_ShouldReturn()
        {
            string org = "ttd";
            string repository = "hvem-er-hvem";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            var textResource = await altinnAppGitRepository.GetTextV1("nb");

            textResource.Should().NotBeNull();
            textResource.Resources.First(r => r.Id == "ServiceName").Value.Should().Be("Hvem er hvem?");
        }

        [Fact]
        public void GetLayoutSetNames_WithAppThatUsesLayoutSet_ShouldReturnLayoutSetNames()
        {
            string org = "ttd";
            string repository = "app-with-layoutsets";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            string[] layoutSetNames = altinnAppGitRepository.GetLayoutSetNames();

            layoutSetNames.Should().NotBeNull();
            layoutSetNames.Should().HaveCount(2);
        }

        [Fact]
        public void GetLayoutSetNames_WithAppThatNotUsesLayoutSet_ShouldReturnDefaultLayoutFolder()
        {
            string org = "ttd";
            string repository = "app-without-layoutsets";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            string[] layoutSetNames = altinnAppGitRepository.GetLayoutSetNames();

            layoutSetNames.Should().NotBeNull();
            layoutSetNames.Should().HaveCount(1);
        }

        [Fact]
        public Task CheckIfAppUsesLayoutSets_ShouldReturnTrue()
        {
            string org = "ttd";
            string repository = "app-with-layoutsets";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            bool appUsesLayoutSets = altinnAppGitRepository.AppUsesLayoutSets();

            appUsesLayoutSets.Should().BeTrue();
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

            appUsesLayoutSets.Should().BeFalse();
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

            layoutNames.Should().NotBeNull();
            layoutNames.Should().HaveCount(2);
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

            layoutNames.Should().NotBeNull();
            layoutNames.Should().HaveCount(2);
            return Task.CompletedTask;
        }

        [Fact]
        public async Task GetLayout_WithAppThatUsesLayoutSet_ShouldReturnLayout()
        {
            string org = "ttd";
            string repository = "app-with-layoutsets";
            string developer = "testUser";
            string layoutSetName = "layoutSet1";
            string layoutName = "layoutFile1InSet1.json";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            JsonNode formLayout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);

            formLayout.Should().NotBeNull();
            formLayout["data"]["layout"].Should().NotBeNull();
        }

        [Fact]
        public async Task GetLayout_WithAppThatNotUsesLayoutSet_ShouldReturnLayout()
        {
            string org = "ttd";
            string repository = "app-without-layoutsets";
            string developer = "testUser";
            string layoutName = "layoutFile1.json";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            JsonNode formLayout = await altinnAppGitRepository.GetLayout(null, layoutName);

            formLayout.Should().NotBeNull();
            formLayout["data"]["layout"].Should().NotBeNull();
        }

        [Fact]
        public async Task SaveLayout_ShouldUpdateLayoutInApp()
        {
            string org = "ttd";
            string repository = "app-with-layoutsets";
            string developer = "testUser";
            string layoutSetName = "layoutSet1";
            string layoutName = "layoutFile2InSet1.json";
            string targetRepository = TestDataHelper.GenerateTestRepoName();

            try
            {
                await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
                AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, targetRepository, developer);

                var formLayoutToSave = JsonNode.Parse("{\"$schema\":\"some-string\",\"data\":{\"layout\":[{\"id\":\"some-id\",\"type\":\"some-type\"}]}}");
                await altinnAppGitRepository.SaveLayout(layoutSetName, layoutName, formLayoutToSave);
                JsonNode formLayoutSaved = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);

                formLayoutSaved.Should().NotBeNull();
                formLayoutSaved["data"]["layout"].Should().NotBeNull();
                (formLayoutSaved["data"]["layout"] as JsonArray).Should().HaveCount(1);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }

        }

        [Fact]
        public async Task GetOptions_WithAppThatHasOptions_ShouldReturnSpecifiecOptionsList()
        {
            string org = "ttd";
            string repository = "app-with-options";
            string developer = "testUser";
            string optionsId = "test-options";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            string options = await altinnAppGitRepository.GetOptions(optionsId);
            options.Should().NotBeNull();
            var optionsArray = JsonNode.Parse(options).AsArray();
            optionsArray.Count.Should().Be(2);
            optionsArray[0]["label"].ToString().Should().Be("label1");
            optionsArray[1]["label"].ToString().Should().Be("label2");
        }

        [Fact]
        public async Task GetOptions_WhenSpecifiedOptionIdDoesNotExistInApp_ShouldThrowNotFoundException()
        {
            string org = "ttd";
            string repository = "app-with-options";
            string developer = "testUser";
            string optionsId = "non-existing-test-options";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            await Assert.ThrowsAsync<LibGit2Sharp.NotFoundException>(async () => await altinnAppGitRepository.GetOptions(optionsId));
        }

        [Fact]
        public Task GetOptionListIds_WithAppThatHasOptionLists_ShouldReturnOptionListPathNames()
        {
            string org = "ttd";
            string repository = "app-with-options";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);

            string[] optionListIds = altinnAppGitRepository.GetOptionListIds();

            optionListIds.Should().NotBeNull();
            optionListIds.Should().HaveCount(2);
            return Task.CompletedTask;
        }

        [Fact]
        public Task GetOptionListIds_WithAppThatHasNoOptionLists_ShouldThrowNotFoundException()
        {
            string org = "ttd";
            string repository = "empty-app";
            string developer = "testUser";
            AltinnAppGitRepository altinnAppGitRepository = PrepareRepositoryForTest(org, repository, developer);
            Assert.Throws<LibGit2Sharp.NotFoundException>(altinnAppGitRepository.GetOptionListIds);
            return Task.CompletedTask;
        }

        private static AltinnAppGitRepository PrepareRepositoryForTest(string org, string repository, string developer)
        {

            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);
            var altinnAppGitRepository = new AltinnAppGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory);

            return altinnAppGitRepository;
        }
    }
}
