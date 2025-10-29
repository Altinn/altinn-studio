#nullable disable
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
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{

    public class UpdateLayoutSetNameTests(WebApplicationFactory<Program> factory)
        : DesignerEndpointsTestsBase<UpdateLayoutSetNameTests>(factory), IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) =>
            $"/designer/api/{org}/{repository}/app-development";

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
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            LayoutSets layoutSetsAfter = await GetLayoutSetsFile(org, targetRepository, developer);

            Assert.NotNull(layoutSetsBefore.Schema);
            Assert.False(layoutSetsBefore.Sets.Exists(set => set.Id == newLayoutSetName));
            Assert.Equal(layoutSetsAfter.Sets.Count, layoutSetsBefore.Sets.Count);
            Assert.NotNull(layoutSetsAfter.Schema);
            Assert.True(layoutSetsAfter.Sets.Exists(set => set.Id == newLayoutSetName));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task UpdateLayoutSetName_NewLayoutSetNameExistsBefore_ReturnsBadRequest(string org, string app, string developer,
            string oldLayoutSetName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            const string ExistingLayoutSetName = "layoutSet2";
            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{oldLayoutSetName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent($"\"{ExistingLayoutSetName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string responseContent = await response.Content.ReadAsStringAsync();
            Dictionary<string, string> responseMessage = JsonSerializer.Deserialize<Dictionary<string, string>>(responseContent);
            Assert.Equal($"Layout set name, {ExistingLayoutSetName}, already exists.", responseMessage["infoMessage"]);
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
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task UpdateLayoutSet_NewLayoutSetNameDoesNotMatchRegex_ReturnsBadRequest(string org, string app, string developer,
            string oldLayoutSetName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string newLayoutSetName = ".abc";

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{oldLayoutSetName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent($"\"{newLayoutSetName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
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
