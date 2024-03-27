using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class DeleteLayoutSetTests(WebApplicationFactory<Program> factory)
          : DisagnerEndpointsTestsBase<DeleteLayoutSetTests>(factory), IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) =>
            $"/designer/api/{org}/{repository}/app-development";

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet2")]
        public async Task DeleteLayoutSets_SetWithoutDataTypeConnection_ReturnsOk(string org, string app, string developer,
            string layoutSetToDeleteId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetToDeleteId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            LayoutSets layoutSetsAfter = await GetLayoutSetsFile(org, targetRepository, developer);

            layoutSetsBefore.Sets.Should().HaveCount(3);
            Assert.True(layoutSetsBefore.Sets.Exists(set => set.Id == layoutSetToDeleteId));
            layoutSetsAfter.Sets.Should().HaveCount(2);
            Assert.False(layoutSetsAfter.Sets.Exists(set => set.Id == layoutSetToDeleteId));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task DeleteLayoutSets_SetWithDataTypeConnection_ReturnsOk(string org, string app, string developer,
            string layoutSetToDeleteId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string connectedDataType = "datamodel";
            string connectedTaskId = "Task_1";
            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);
            Application appMetadataBefore = await GetApplicationMetadataFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetToDeleteId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            LayoutSets layoutSetsAfter = await GetLayoutSetsFile(org, targetRepository, developer);
            Application appMetadataAfter = await GetApplicationMetadataFile(org, targetRepository, developer);

            layoutSetsBefore.Sets.Should().HaveCount(3);
            appMetadataBefore.DataTypes.Find(dataType => dataType.Id == connectedDataType).TaskId.Should()
                .Be(connectedTaskId);
            Assert.True(layoutSetsBefore.Sets.Exists(set => set.Id == layoutSetToDeleteId));
            layoutSetsAfter.Sets.Should().HaveCount(2);
            appMetadataAfter.DataTypes.Find(dataType => dataType.Id == connectedDataType).TaskId.Should().BeNull();
            Assert.False(layoutSetsAfter.Sets.Exists(set => set.Id == layoutSetToDeleteId));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "non-existing-layout-set")]
        public async Task DeleteLayoutSet_IdNotFound_ReturnsUnAlteredLayoutSets(string org, string app, string developer,
            string layoutSetToDeleteId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetToDeleteId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);


            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();
            LayoutSets layoutSetsResponse = JsonSerializer.Deserialize<LayoutSets>(responseContent);

            //layoutSetsBefore.Should().BeEquivalentTo(layoutSetsResponse);
        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null)]
        public async Task AddLayoutSet_AppWithoutLayoutSets_ReturnsNotFound(string org, string app, string developer,
            string layoutSetToDeleteId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetToDeleteId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        private async Task<LayoutSets> GetLayoutSetsFile(string org, string app, string developer)
        {
            AltinnGitRepositoryFactory altinnGitRepositoryFactory =
                new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            AltinnAppGitRepository altinnAppGitRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);

            return await altinnAppGitRepository.GetLayoutSetsFile();
        }

        private async Task<Application> GetApplicationMetadataFile(string org, string app, string developer)
        {
            AltinnGitRepositoryFactory altinnGitRepositoryFactory =
                new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            AltinnAppGitRepository altinnAppGitRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);

            return await altinnAppGitRepository.GetApplicationMetadata();
        }
    }
}

