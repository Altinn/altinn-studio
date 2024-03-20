using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
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
        public async Task UpdateLayoutSet_NewConfigOnSameSet_ReturnsOk(string org, string app, string developer,
            string layoutSetIdToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string newDataModel = "NewDataModel";
            var newLayoutSetConfig = new LayoutSetConfig() { Id = layoutSetIdToUpdate, DataType = newDataModel };
            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetIdToUpdate}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(newLayoutSetConfig), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            LayoutSets layoutSetsAfter = await GetLayoutSetsFile(org, targetRepository, developer);

            layoutSetsBefore.Sets.Should().HaveCount(3);
            Assert.False(layoutSetsBefore.Sets.Exists(set => set.DataType == newLayoutSetConfig.DataType));
            layoutSetsAfter.Sets.Should().HaveCount(3);
            Assert.True(layoutSetsAfter.Sets.Exists(set => set.DataType == newLayoutSetConfig.DataType));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task UpdateLayoutSet_NewIdOnExistingSet_ReturnsOk(string org, string app, string developer,
            string layoutSetIdToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = "newSet" };
            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetIdToUpdate}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(newLayoutSetConfig), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            LayoutSets layoutSetsAfter = await GetLayoutSetsFile(org, targetRepository, developer);

            layoutSetsBefore.Sets.Should().HaveCount(3);
            Assert.False(layoutSetsBefore.Sets.Exists(set => set.Id == newLayoutSetConfig.Id));
            layoutSetsAfter.Sets.Should().HaveCount(3);
            Assert.True(layoutSetsAfter.Sets.Exists(set => set.Id == newLayoutSetConfig.Id));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task UpdateLayoutSet_NewLayoutSetIdExistsBefore_ReturnsBadRequest(string org, string app, string developer,
            string layoutSetIdToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = "layoutSet2" };

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

    }
}
