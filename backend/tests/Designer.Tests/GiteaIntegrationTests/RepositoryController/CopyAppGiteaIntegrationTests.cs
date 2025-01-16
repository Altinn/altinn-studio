using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests.RepositoryController
{
    public class CopyAppGiteaIntegrationTests : GiteaIntegrationTestsBase<CopyAppGiteaIntegrationTests>
    {

        private string CopyRepoName { get; set; }
        private string TargetCopyOrg { get; set; }

        public CopyAppGiteaIntegrationTests(GiteaWebAppApplicationFactoryFixture<Program> factory, GiteaFixture giteaFixture, SharedDesignerHttpClientProvider sharedDesignerHttpClientProvider) : base(factory, giteaFixture, sharedDesignerHttpClientProvider)
        {
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.TestOrgUsername)]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.TestUser)]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.SecondaryTestOrgUsername)]
        public async Task Copy_Repo_Should_Return_Created(string org, string targetOrg)
        {
            TargetCopyOrg = targetOrg;
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            CopyRepoName = TestDataHelper.GenerateTestRepoName("-gitea-copy");

            // Copy app1
            using HttpResponseMessage commitResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/copy-app?sourceRepository={targetRepo}&targetRepository={CopyRepoName}&targetOrg={TargetCopyOrg}", null);
            Assert.Equal(HttpStatusCode.Created, commitResponse.StatusCode);

            // Check if repo exists in git
            using HttpResponseMessage response = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{TargetCopyOrg}/{CopyRepoName}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
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

            string copyRepoPath = Path.Combine(TestRepositoriesLocation, GiteaConstants.TestUser, TargetCopyOrg, CopyRepoName);
            DeleteDirectoryIfExists(copyRepoPath);
        }
    }
}
