using System.Net;
using System.Net.Http;
using System.Text;
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

    public class UpdateLayoutSetTests(WebApplicationFactory<Program> factory)
        : DisagnerEndpointsTestsBase<UpdateLayoutSetTests>(factory), IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) =>
            $"/designer/api/{org}/{repository}/app-development";

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task UpdateLayoutSet_NewIdOnExistingSet_ReturnsOk(string org, string app, string developer,
            string layoutSetIdToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string newLayoutSetId = "newSetId";
            string connectedTask = "Task_1";
            string connectedDataModel = "datamodel";
            var newLayoutSetConfig = new LayoutSetConfig() { Id = newLayoutSetId, DataType = connectedDataModel, Tasks = [connectedTask] };
            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetIdToUpdate}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(newLayoutSetConfig), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            LayoutSets layoutSetsAfter = await GetLayoutSetsFile(org, targetRepository, developer);

            layoutSetsBefore.Schema.Should().NotBeNull();
            layoutSetsBefore.Sets.Should().HaveCount(3);
            Assert.False(layoutSetsBefore.Sets.Exists(set => set.Id == newLayoutSetConfig.Id));
            layoutSetsAfter.Schema.Should().NotBeNull();
            layoutSetsAfter.Sets.Should().HaveCount(3);
            Assert.True(layoutSetsAfter.Sets.Exists(set => set.Id == newLayoutSetConfig.Id));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task UpdateLayoutSet_NewDataModelOnExistingSetWithConnectedDataType_ReturnsOk(string org, string app, string developer,
            string layoutSetIdToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string connectedTask = "Task_1";
            string connectedDataModel = "datamodel";
            string newDataModel = "unUsedDatamodel";
            var newLayoutSetConfig = new LayoutSetConfig() { Id = layoutSetIdToUpdate, DataType = newDataModel, Tasks = [connectedTask] };
            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);
            Application appMetadataBefore = await GetApplicationMetadataFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetIdToUpdate}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(newLayoutSetConfig), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            LayoutSets layoutSetsAfter = await GetLayoutSetsFile(org, targetRepository, developer);
            Application appMetadataAfter = await GetApplicationMetadataFile(org, targetRepository, developer);

            layoutSetsBefore.Sets.Should().HaveCount(3);
            appMetadataBefore.DataTypes.Find(dataType => dataType.Id == connectedDataModel).TaskId.Should().Be(connectedTask);
            appMetadataBefore.DataTypes.Find(dataType => dataType.Id == newDataModel).TaskId.Should().BeNull();
            Assert.False(layoutSetsBefore.Sets.Exists(set => set.DataType == newLayoutSetConfig.DataType));
            layoutSetsAfter.Sets.Should().HaveCount(3);
            appMetadataAfter.DataTypes.Find(dataType => dataType.Id == connectedDataModel).TaskId.Should().BeNull();
            appMetadataAfter.DataTypes.Find(dataType => dataType.Id == newDataModel).TaskId.Should().Be(connectedTask);
            Assert.True(layoutSetsAfter.Sets.Exists(set => set.DataType == newLayoutSetConfig.DataType));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet2")]
        public async Task UpdateLayoutSet_NewDataModelOnExistingSetWithoutConnectedDataType_ReturnsOk(string org, string app, string developer,
            string layoutSetIdToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string connectedTask = "Task_2";
            string newDataModel = "unUsedDatamodel";
            var newLayoutSetConfig = new LayoutSetConfig() { Id = layoutSetIdToUpdate, DataType = newDataModel, Tasks = [connectedTask] };
            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);
            Application appMetadataBefore = await GetApplicationMetadataFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetIdToUpdate}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(newLayoutSetConfig), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            LayoutSets layoutSetsAfter = await GetLayoutSetsFile(org, targetRepository, developer);
            Application appMetadataAfter = await GetApplicationMetadataFile(org, targetRepository, developer);

            layoutSetsBefore.Sets.Should().HaveCount(3);
            appMetadataBefore.DataTypes.Find(dataType => dataType.Id == newDataModel).TaskId.Should().BeNull();
            layoutSetsBefore.Sets.Find(set => set.Id == newLayoutSetConfig.Id).DataType.Should().BeNull();
            layoutSetsAfter.Sets.Should().HaveCount(3);
            appMetadataAfter.DataTypes.Find(dataType => dataType.Id == newDataModel).TaskId.Should().Be(connectedTask);
            layoutSetsAfter.Sets.Find(set => set.Id == newLayoutSetConfig.Id).DataType.Should().Be(newDataModel);
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task UpdateLayoutSet_NewLayoutSetIdExistsBefore_ReturnsBadRequest(string org, string app, string developer,
            string layoutSetIdToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string existingLayoutSetId = "layoutSet2";
            var newLayoutSetConfig = new LayoutSetConfig() { Id = existingLayoutSetId };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetIdToUpdate}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(newLayoutSetConfig), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task UpdateLayoutSet_NewLayoutSetIdIsEmpty_ReturnsBadRequest(string org, string app, string developer,
            string layoutSetIdToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = "" };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetIdToUpdate}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(newLayoutSetConfig), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null)]
        public async Task UpdateLayoutSet_AppWithoutLayoutSets_ReturnsNotFound(string org, string app, string developer,
            string layoutSetIdToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = "newSet" };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetIdToUpdate}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(newLayoutSetConfig), Encoding.UTF8, "application/json")
            };

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
