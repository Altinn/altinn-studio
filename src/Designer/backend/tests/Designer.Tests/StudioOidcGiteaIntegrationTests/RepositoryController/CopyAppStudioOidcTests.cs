using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.StudioOidcGiteaIntegrationTests.RepositoryController
{
    public class CopyAppStudioOidcTests : StudioOidcGiteaIntegrationTestsBase<CopyAppStudioOidcTests>
    {
        private string CopyRepoName { get; set; }
        private string TargetCopyOrg { get; set; }

        private string CopyRepoPath =>
            Path.Combine(TestRepositoriesLocation, GiteaConstants.TestUser, TargetCopyOrg, CopyRepoName);

        public CopyAppStudioOidcTests(
            StudioOidcGiteaWebAppApplicationFactoryFixture<Program> factory,
            StudioOidcGiteaFixture giteaFixture,
            StudioOidcSharedDesignerHttpClientProvider sharedDesignerHttpClientProvider
        )
            : base(factory, giteaFixture, sharedDesignerHttpClientProvider) { }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.TestOrgUsername)]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.TestUser)]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.SecondaryTestOrgUsername)]
        public async Task Copy_Repo_Should_Return_Created(string org, string targetOrg)
        {
            TargetCopyOrg = targetOrg;
            string targetRepo = TestDataHelper.GenerateTestRepoName("-oidc");
            await CreateAppUsingDesigner(org, targetRepo);

            await File.WriteAllTextAsync($"{CreatedFolderPath}/test.txt", "I am a new file");
            using var commitAndPushContent = new StringContent(
                GetCommitInfoJson("test commit", org, targetRepo),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            );
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync(
                $"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push",
                commitAndPushContent
            );
            Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);

            CopyRepoName = TestDataHelper.GenerateTestRepoName("-oidc-copy");

            using HttpResponseMessage copyReponse = await HttpClient.PostAsync(
                $"designer/api/repos/repo/{org}/copy-app?sourceRepository={targetRepo}&targetRepository={CopyRepoName}&targetOrg={TargetCopyOrg}",
                null
            );
            Assert.Equal(HttpStatusCode.Created, copyReponse.StatusCode);

            using HttpResponseMessage response = await GiteaFixture.GiteaClient.Value.GetAsync(
                $"repos/{TargetCopyOrg}/{CopyRepoName}"
            );
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername, GiteaConstants.TestOrgUsername)]
        public async Task Copy_Repo_Should_BeAbleToWorkWithCopyRepo(string org, string targetOrg)
        {
            await Copy_Repo_Should_Return_Created(org, targetOrg);

            await File.WriteAllTextAsync($"{CopyRepoPath}/copyRepo.txt", "I am a new file");
            using var commitAndPushContent = new StringContent(
                GetCommitInfoJson("test commit", org, CopyRepoName),
                Encoding.UTF8,
                MediaTypeNames.Application.Json
            );
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync(
                $"designer/api/repos/repo/{org}/{CopyRepoName}/commit-and-push",
                commitAndPushContent
            );
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
