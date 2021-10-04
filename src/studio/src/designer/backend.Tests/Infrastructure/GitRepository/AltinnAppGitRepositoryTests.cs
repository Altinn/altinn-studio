using System;
using System.Linq;
using System.Threading.Tasks;
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
            var org = "ttd";
            var repository = "hvem-er-hvem";
            var developer = "testUser";

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
            var org = "ttd";
            var repository = "hvem-er-hvem";
            var developer = "testUser";

            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);
            var altinnAppGitRepository = new AltinnAppGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory);

            var applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
                        
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

            var dataField = applicationMetadata.DataFields.First(d => d.Id == "GeekType");
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
            var org = "ttd";
            var repository = "hvem-er-hvem";
            var developer = "testUser";

            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);
            var altinnAppGitRepository = new AltinnAppGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory);

            var textResource = await altinnAppGitRepository.GetTextResources("nb");

            textResource.Should().NotBeNull();
            textResource.Resources.First(r => r.Id == "ServiceName").Value.Should().Be("Hvem er hvem?");
        }

        [Fact]
        public async Task GetTextResourcesForAllLanguages_ResourceExists_ShouldReturn()
        {
            var org = "ttd";
            var repository = "hvem-er-hvem";
            var developer = "testUser";

            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);
            var altinnAppGitRepository = new AltinnAppGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory);

            var allResources = await altinnAppGitRepository.GetTextResourcesForAllLanguages();

            allResources.Should().NotBeNull();
            allResources.Should().HaveCount(12);
            allResources.First(r => r.Key == "ServiceName").Value.Should().HaveCount(2);
            allResources.First(r => r.Key == "ServiceName").Value.First(r => r.Key == "en").Value.Value.Should().Be("who-is-who");
            allResources.First(r => r.Key == "ServiceName").Value.First(r => r.Key == "nb").Value.Value.Should().Be("Hvem er hvem?");
        }
    }
}
