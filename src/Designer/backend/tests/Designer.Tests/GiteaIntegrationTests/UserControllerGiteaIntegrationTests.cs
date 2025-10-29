#nullable disable
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests
{
    public class UserControllerGiteaIntegrationTests : GiteaIntegrationTestsBase<UserControllerGiteaIntegrationTests>
    {
        public UserControllerGiteaIntegrationTests(GiteaWebAppApplicationFactoryFixture<Program> factory,
            GiteaFixture giteaFixture, SharedDesignerHttpClientProvider sharedDesignerHttpClientProvider) : base(
            factory, giteaFixture, sharedDesignerHttpClientProvider)
        {
        }

        [Theory]
        [InlineData(GiteaConstants.TestUser, GiteaConstants.TestUserEmail)]
        public async Task GetCurrentUser_ShouldReturnOk(string expectedUserName, string expectedEmail)
        {
            string requestUrl = "designer/api/user/current";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, requestUrl);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains("XSRF-TOKEN", response.Headers.GetValues("Set-Cookie").First());
            string content = await response.Content.ReadAsStringAsync();
            var user = JsonSerializer.Deserialize<User>(content,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.Equal(expectedUserName, user.Login);
            Assert.Equal(expectedEmail, user.Email);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task UserRepos_ShouldReturnOk(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName();
            await CreateAppUsingDesigner(org, targetRepo);

            string requestUrl = "designer/api/user/repos";
            using var response = await HttpClient.GetAsync(requestUrl);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var content = await response.Content.ReadAsAsync<List<Repository>>();

            Assert.NotNull(content);
            Assert.Contains(content, r => r.Name == targetRepo);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task StarredEndpoints_ShouldBehaveAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName();
            await CreateAppUsingDesigner(org, targetRepo);

            using var putStarredResponse =
                await HttpClient.PutAsync($"designer/api/user/starred/{org}/{targetRepo}", null);
            Assert.Equal(HttpStatusCode.NoContent, putStarredResponse.StatusCode);
            await GetAndVerifyStarredRepos(targetRepo);

            using var deleteStarredResponse =
                await HttpClient.DeleteAsync($"designer/api/user/starred/{org}/{targetRepo}");
            Assert.Equal(HttpStatusCode.NoContent, deleteStarredResponse.StatusCode);

            await GetAndVerifyStarredRepos();
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername, true)]
        [InlineData("OtherOrg", false)]
        public async Task HasAccessToCreateRepository_ShouldReturnCorrectPermissions(string org, bool expectedCanCreate)
        {
            string requestUrl = $"designer/api/user/org-permissions/{org}";

            using var response = await HttpClient.GetAsync(requestUrl);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string content = await response.Content.ReadAsStringAsync();
            var deserializeOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            };

            var userOrgPermission = JsonSerializer.Deserialize<Team>(content, deserializeOptions);

            Assert.NotNull(userOrgPermission);
            Assert.Equal(expectedCanCreate, userOrgPermission.CanCreateOrgRepo);
        }

        private async Task GetAndVerifyStarredRepos(params string[] expectedStarredRepos)
        {
            using var response = await HttpClient.GetAsync("designer/api/user/starred");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var content = await response.Content.ReadAsAsync<List<Repository>>();
            Assert.NotNull(content);
            Assert.Equal(expectedStarredRepos.Length, content.Count);
            foreach (string expectedStarredRepo in expectedStarredRepos)
            {
                Assert.Contains(content, r => r.Name == expectedStarredRepo);
            }
        }
    }
}
