using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests.RepositoryController
{
    public class CopyAppGiteaIntegrationTests : GiteaIntegrationTestsBase<CopyAppGiteaIntegrationTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        private string CopyRepoName { get; set; }

        public CopyAppGiteaIntegrationTests(WebApplicationFactory<Program> factory, GiteaFixture giteaFixture) : base(factory, giteaFixture)
        {
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.TestOrgUsername)]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.TestUser)]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.SecondaryTestOrgUsername)]
        public async Task Copy_Repo_Should_Return_Created(string org, string targetOrg)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            CopyRepoName = TestDataHelper.GenerateTestRepoName("-gitea-copy");

            // Copy app
            using HttpResponseMessage commitResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/copy-app?sourceRepository={targetRepo}&targetRepository={CopyRepoName}&targetOrg={targetOrg}", null);
            commitResponse.StatusCode.Should().Be(HttpStatusCode.Created);

            // Check if repo exists in git
            using HttpResponseMessage response = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{targetOrg}/{CopyRepoName}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (!disposing)
            {
                return;
            }
            if (string.IsNullOrEmpty(CopyRepoName))
            {
                return;
            }

            string copyRepoPath = Path.Combine(TestRepositoriesLocation, "testUser", "ttd", CopyRepoName);
            DeleteDirectoryIfExists(copyRepoPath);
        }
    }
}
