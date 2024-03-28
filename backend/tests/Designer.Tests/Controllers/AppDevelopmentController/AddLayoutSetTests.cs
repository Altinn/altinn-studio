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
using Npgsql.Replication.PgOutput.Messages;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class AddLayoutSetTests(WebApplicationFactory<Program> factory)
          : DisagnerEndpointsTestsBase<AddLayoutSetTests>(factory), IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) =>
            $"/designer/api/{org}/{repository}/app-development";

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "newSet")]
        public async Task AddLayoutSets_NewSet_ReturnsOk(string org, string app, string developer,
            string layoutSetId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = layoutSetId };
            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(newLayoutSetConfig), Encoding.UTF8, "application/json")
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
        public async Task AddLayoutSet_NewLayoutSetIdExistsBefore_ReturnsBadRequest(string org, string app, string developer,
           string layoutSetId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = layoutSetId };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(newLayoutSetConfig), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task AddLayoutSet_NewLayoutSetIdIsEmpty_ReturnsBadRequest(string org, string app, string developer,
            string layoutSetId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = "" };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(newLayoutSetConfig), Encoding.UTF8, "application/json")
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null)]
        public async Task AddLayoutSet_AppWithoutLayoutSets_ReturnsNotFound(string org, string app, string developer,
            string layoutSetId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            var newLayoutSetConfig = new LayoutSetConfig() { Id = "newSet" };

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
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

