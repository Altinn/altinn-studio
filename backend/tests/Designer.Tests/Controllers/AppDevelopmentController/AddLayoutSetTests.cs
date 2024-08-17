using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Filters.AppDevelopment;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Npgsql.Replication.PgOutput.Messages;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class AddLayoutSetTests(WebApplicationFactory<Program> factory)
          : DesignerEndpointsTestsBase<AddLayoutSetTests>(factory), IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) =>
            $"/api/{org}/{repository}/app-development";

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "newSet")]
        public async Task AddLayoutSets_NewSet_ReturnsOk(string org, string app, string developer,
            string layoutSetId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = layoutSetId, Tasks = ["NewTask"] };
            LayoutSetPayload layoutSetPayload = new LayoutSetPayload()
            { TaskType = "data", LayoutSetConfig = newLayoutSetConfig };

            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(layoutSetPayload), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            LayoutSets layoutSetsAfter = await GetLayoutSetsFile(org, targetRepository, developer);

            layoutSetsBefore.Schema.Should().NotBeNull();
            Assert.False(layoutSetsBefore.Sets.Exists(set => set.Id == newLayoutSetConfig.Id));
            layoutSetsBefore.Sets.Count.Should().Be(layoutSetsAfter.Sets.Count - 1);
            layoutSetsAfter.Schema.Should().NotBeNull();
            Assert.True(layoutSetsAfter.Sets.Exists(set => set.Id == newLayoutSetConfig.Id));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task AddLayoutSet_NewLayoutSetIdExistsBefore_ReturnsOKButWithConflictDetails(string org, string app, string developer,
           string layoutSetId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = layoutSetId, Tasks = ["newTask"] };
            LayoutSetPayload layoutSetPayload = new LayoutSetPayload()
            { TaskType = "data", LayoutSetConfig = newLayoutSetConfig };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(layoutSetPayload), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string responseContent = await response.Content.ReadAsStringAsync();
            Dictionary<string, string> responseMessage = JsonSerializer.Deserialize<Dictionary<string, string>>(responseContent);
            Assert.Equal($"Layout set name, {layoutSetId}, already exists.", responseMessage["infoMessage"]);
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "newSet")]
        public async Task AddLayoutSet_NewLayoutSetTaskIdExistsBefore_ReturnsOKButWithConflictDetails(string org, string app, string developer,
            string layoutSetId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            const string existingTaskId = "Task_1";
            var newLayoutSetConfig = new LayoutSetConfig() { Id = layoutSetId, Tasks = [existingTaskId] };
            LayoutSetPayload layoutSetPayload = new LayoutSetPayload()
            { TaskType = "data", LayoutSetConfig = newLayoutSetConfig };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(layoutSetPayload), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string responseContent = await response.Content.ReadAsStringAsync();
            Dictionary<string, string> responseMessage = JsonSerializer.Deserialize<Dictionary<string, string>>(responseContent);
            Assert.Equal($"Layout set with task, {existingTaskId}, already exists.", responseMessage["infoMessage"]);
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task AddLayoutSet_NewLayoutSetIdIsEmpty_ReturnsBadRequest(string org, string app, string developer,
            string layoutSetId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = "" };
            LayoutSetPayload layoutSetPayload = new LayoutSetPayload()
            { TaskType = "data", LayoutSetConfig = newLayoutSetConfig };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(layoutSetPayload), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "newSet")]
        public async Task AddLayoutSet_TaskTypeIsNull_AddsLayoutSetAndReturnsOk(string org, string app, string developer,
            string layoutSetId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = layoutSetId, Tasks = ["NewTask"] };
            LayoutSetPayload layoutSetPayload = new LayoutSetPayload()
            { TaskType = null, LayoutSetConfig = newLayoutSetConfig };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(layoutSetPayload), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "newSet")]
        public async Task AddLayoutSet_TaskTypeIsPayment_AddsLayoutSetWithPaymentComponentInInitialLayoutAndReturnsOk(string org, string app, string developer,
            string layoutSetId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = layoutSetId, Tasks = ["NewTask"] };
            LayoutSetPayload layoutSetPayload = new LayoutSetPayload()
            { TaskType = TaskType.Payment, LayoutSetConfig = newLayoutSetConfig };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(layoutSetPayload), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            JsonNode initialLayout = await GetLayoutFile(org, targetRepository, developer, layoutSetId);

            var defaultComponent = new JsonObject
            {
                ["id"] = "PaymentComponentId",
                ["type"] = "Payment",
                ["renderAsSummary"] = true
            };

            JsonArray layout = initialLayout["data"]["layout"] as JsonArray;
            layout.Count.Should().Be(1);
            initialLayout["data"]["layout"][0].Should().BeEquivalentTo(defaultComponent, options => options.RespectingRuntimeTypes().IgnoringCyclicReferences());
        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null)]
        public async Task AddLayoutSet_AppWithoutLayoutSets_ReturnsNotFound(string org, string app, string developer,
            string layoutSetId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = layoutSetId, Tasks = ["NewTask"] };
            LayoutSetPayload layoutSetPayload = new LayoutSetPayload()
            { TaskType = "data", LayoutSetConfig = newLayoutSetConfig };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(layoutSetPayload), Encoding.UTF8, "application/json")
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

        private async Task<JsonNode> GetLayoutFile(string org, string app, string developer, string layoutSetName)
        {
            AltinnGitRepositoryFactory altinnGitRepositoryFactory =
                new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            AltinnAppGitRepository altinnAppGitRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);

            return await altinnAppGitRepository.GetLayout(layoutSetName, AltinnAppGitRepository.InitialLayoutFileName);
        }
    }
}

