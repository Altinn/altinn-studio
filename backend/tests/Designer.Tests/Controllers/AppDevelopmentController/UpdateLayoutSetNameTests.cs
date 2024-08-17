using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
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

    public class UpdateLayoutSetNameTests(WebApplicationFactory<Program> factory)
        : DesignerEndpointsTestsBase<UpdateLayoutSetNameTests>(factory), IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) =>
            $"/api/{org}/{repository}/app-development";

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task UpdateLayoutSetName_ReturnsOk(string org, string app, string developer,
            string oldLayoutSetName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string newLayoutSetName = "newSetId";
            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{oldLayoutSetName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent($"\"{newLayoutSetName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            LayoutSets layoutSetsAfter = await GetLayoutSetsFile(org, targetRepository, developer);

            layoutSetsBefore.Schema.Should().NotBeNull();
            Assert.False(layoutSetsBefore.Sets.Exists(set => set.Id == newLayoutSetName));
            layoutSetsBefore.Sets.Should().HaveCount(layoutSetsAfter.Sets.Count);
            layoutSetsAfter.Schema.Should().NotBeNull();
            Assert.True(layoutSetsAfter.Sets.Exists(set => set.Id == newLayoutSetName));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task UpdateLayoutSetName_NewLayoutSetNameExistsBefore_ReturnsBadRequest(string org, string app, string developer,
            string oldLayoutSetName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            const string existingLayoutSetName = "layoutSet2";
            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{oldLayoutSetName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent($"\"{existingLayoutSetName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string responseContent = await response.Content.ReadAsStringAsync();
            Dictionary<string, string> responseMessage = JsonSerializer.Deserialize<Dictionary<string, string>>(responseContent);
            Assert.Equal($"Layout set name, {existingLayoutSetName}, already exists.", responseMessage["infoMessage"]);
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task UpdateLayoutSet_NewLayoutSetNameIsEmpty_ReturnsBadRequest(string org, string app, string developer,
            string oldLayoutSetName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string newLayoutSetName = "";

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{oldLayoutSetName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent($"\"{newLayoutSetName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null)]
        public async Task UpdateLayoutSetName_AppWithoutLayoutSets_ReturnsNotFound(string org, string app, string developer,
            string oldLayoutSetName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string newLayoutSetName = "newSet";

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{oldLayoutSetName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent($"\"{newLayoutSetName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
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
