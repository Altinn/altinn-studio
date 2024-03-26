using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Filters.AppDevelopment;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
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
        public async Task UpdateLayoutSet_NewConfigOnSameSet_ReturnsOk(string org, string app, string developer,
            string layoutSetIdToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string newDataModel = "NewDataModel";
            var newLayoutSetConfig = new LayoutSetConfig() { Id = layoutSetIdToUpdate, DataType = newDataModel, Tasks = ["Task_1"] };
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
            Assert.False(layoutSetsBefore.Sets.Exists(set => set.DataType == newLayoutSetConfig.DataType));
            layoutSetsAfter.Schema.Should().NotBeNull();
            layoutSetsBefore.Sets.Should().HaveCount(layoutSetsAfter.Sets.Count);
            Assert.True(layoutSetsAfter.Sets.Exists(set => set.DataType == newLayoutSetConfig.DataType));
        }

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
            Assert.False(layoutSetsBefore.Sets.Exists(set => set.Id == newLayoutSetConfig.Id));
            layoutSetsBefore.Sets.Should().HaveCount(layoutSetsAfter.Sets.Count);
            layoutSetsAfter.Schema.Should().NotBeNull();
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

            appMetadataBefore.DataTypes.Find(dataType => dataType.Id == connectedDataModel).TaskId.Should().Be(connectedTask);
            appMetadataBefore.DataTypes.Find(dataType => dataType.Id == newDataModel).TaskId.Should().BeNull();
            Assert.False(layoutSetsBefore.Sets.Exists(set => set.DataType == newLayoutSetConfig.DataType));
            layoutSetsAfter.Sets.Should().HaveCount(layoutSetsBefore.Sets.Count);
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

            appMetadataBefore.DataTypes.Find(dataType => dataType.Id == newDataModel).TaskId.Should().BeNull();
            layoutSetsBefore.Sets.Find(set => set.Id == newLayoutSetConfig.Id).DataType.Should().BeNull();
            layoutSetsAfter.Sets.Should().HaveCount(layoutSetsBefore.Sets.Count);
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
            const string existingLayoutSetName = "layoutSet2";
            var newLayoutSetConfig = new LayoutSetConfig() { Id = existingLayoutSetName, Tasks = ["newTask"] };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetIdToUpdate}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(newLayoutSetConfig), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string responseContent = await response.Content.ReadAsStringAsync();
            Dictionary<string, string> responseMessage = JsonSerializer.Deserialize<Dictionary<string, string>>(responseContent);
            Assert.Equal($"Layout set name, {existingLayoutSetName}, already exists.", responseMessage["infoMessage"]);
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
