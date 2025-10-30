#nullable disable
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

        private string CopyRepoName { get; set; }
        private string TargetCopyOrg { get; set; }

        private string CopyRepoPath => Path.Combine(TestRepositoriesLocation, GiteaConstants.TestUser, TargetCopyOrg, CopyRepoName);

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

            // Add some commit and push to be more realistic use case, this also adds notes to the commit
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test.txt", "I am a new file");
            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent);
            Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);

            CopyRepoName = TestDataHelper.GenerateTestRepoName("-gitea-copy");

            // Copy app1
            using HttpResponseMessage copyReponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/copy-app?sourceRepository={targetRepo}&targetRepository={CopyRepoName}&targetOrg={TargetCopyOrg}", null);
            Assert.Equal(HttpStatusCode.Created, copyReponse.StatusCode);

            // Check if repo exists in git
            using HttpResponseMessage response = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{TargetCopyOrg}/{CopyRepoName}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        }


        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.TestOrgUsername)]
        public async Task Copy_Repo_Should_BeAbleToWorkWithCopyRepo(string org, string targetOrg)
        {
            await Copy_Repo_Should_Return_Created(org, targetOrg);

            // add changes to the new repo and try commit and push
            await File.WriteAllTextAsync($"{CopyRepoPath}/copyRepo.txt", "I am a new file");
            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, CopyRepoName), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{CopyRepoName}/commit-and-push", commitAndPushContent);
            Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);
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

            DeleteDirectoryIfExists(CopyRepoPath);
        }
    }
}
