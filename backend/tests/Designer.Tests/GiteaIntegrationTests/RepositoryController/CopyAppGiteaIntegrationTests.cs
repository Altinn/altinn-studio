using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests.RepositoryController
{
    public class CopyAppGiteaIntegrationTests : GiteaIntegrationTestsBase<CopyAppGiteaIntegrationTests>
    {

        private string _copyRepoName { get; set; }
        private string _targetCopyOrg { get; set; }

        private string _copyRepoPath => Path.Combine(TestRepositoriesLocation, GiteaConstants.TestUser, _targetCopyOrg, _copyRepoName);

        public CopyAppGiteaIntegrationTests(GiteaWebAppApplicationFactoryFixture<Program> factory, GiteaFixture giteaFixture, SharedDesignerHttpClientProvider sharedDesignerHttpClientProvider) : base(factory, giteaFixture, sharedDesignerHttpClientProvider)
        {
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.TestOrgUsername)]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.TestUser)]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.SecondaryTestOrgUsername)]
        public async Task Copy_Repo_Should_Return_Created(string org, string targetOrg)
        {
            _targetCopyOrg = targetOrg;
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Add some commit and push to be more realistic use case, this also adds notes to the commit
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test.txt", "I am a new file");
            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent);
            Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);

            _copyRepoName = TestDataHelper.GenerateTestRepoName("-gitea-copy");

            // Copy app1
            using HttpResponseMessage copyReponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/copy-app?sourceRepository={targetRepo}&targetRepository={_copyRepoName}&targetOrg={_targetCopyOrg}", null);
            Assert.Equal(HttpStatusCode.Created, copyReponse.StatusCode);

            // Check if repo exists in git
            using HttpResponseMessage response = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{_targetCopyOrg}/{_copyRepoName}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        }


        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.TestOrgUsername)]
        public async Task Copy_Repo_Should_BeAbleToWorkWithCopyRepo(string org, string targetOrg)
        {
            await Copy_Repo_Should_Return_Created(org, targetOrg);

            // add changes to the new repo and try commit and push
            await File.WriteAllTextAsync($"{_copyRepoPath}/copyRepo.txt", "I am a new file");
            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, _copyRepoName), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{_copyRepoName}/commit-and-push", commitAndPushContent);
            Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (!disposing)
            {
                return;
            }
            if (string.IsNullOrEmpty(_copyRepoName))
            {
                return;
            }

            DeleteDirectoryIfExists(_copyRepoPath);
        }
    }
}
