using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests.RepositoryController
{
    public class GitNotesGiteaIntegrationTests : GiteaIntegrationTestsBase<CopyAppGiteaIntegrationTests>
    {

        public GitNotesGiteaIntegrationTests(GiteaWebAppApplicationFactoryFixture<Program> factory, GiteaFixture giteaFixture, SharedDesignerHttpClientProvider sharedDesignerHttpClientProvider) : base(factory, giteaFixture, sharedDesignerHttpClientProvider)
        {
        }
        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task Commit_AndPush_Separate_Should_Create_GitNote(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Commit and push separately
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test3.txt", "I am a new file");
            using var commitContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit", commitContent);
            Assert.Equal(HttpStatusCode.OK, commitResponse.StatusCode);

            using HttpResponseMessage pushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/push", null);
            Assert.Equal(HttpStatusCode.OK, pushResponse.StatusCode);

            await VerifyStudioNoteAddedToLatestCommit(org, targetRepo);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task Commit_AndPush_AndContents_Should_Create_GitNote(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Add a file to local repo and try to push with designer
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test.txt", "I am a new file");

            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent);
            Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);

            await VerifyStudioNoteAddedToLatestCommit(org, targetRepo);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task Commit_AndPush_AndContents_WorksAfterResetOfRepo(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Add a file to local repo and try to push with designer
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test.txt", "I am a new file");

            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent);
            Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);

            await VerifyStudioNoteAddedToLatestCommit(org, targetRepo);

            // reset repo
            using HttpResponseMessage resetResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/reset");
            Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

            // this ensures local clone
            using HttpResponseMessage appDevelopmentIndes = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/status");
            Assert.Equal(HttpStatusCode.OK, appDevelopmentIndes.StatusCode);

            // Try to create a new commit
            await File.WriteAllTextAsync($"{CreatedFolderPath}/newFile.txt", "I am a new file");

            using var commitAndPushContent2 = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse2 = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent2);
            Assert.Equal(HttpStatusCode.OK, commitAndPushResponse2.StatusCode);

            await VerifyStudioNoteAddedToLatestCommit(org, targetRepo);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task LocalAndStudioDevelopment_PullLocalCommitFirst_BehaveAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);
            await VerifyStudioNoteAddedToLatestCommit(org, targetRepo);

            // Create a file using gitea client
            using var createFileContent = new StringContent(GenerateCommitJsonPayload("I am a new file created in gitea", "test gitea commit"), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage createFileResponse = await GiteaFixture.GiteaClient.Value.PostAsync($"repos/{org}/{targetRepo}/contents/test2.txt", createFileContent);
            Assert.Equal(HttpStatusCode.Created, createFileResponse.StatusCode);

            // Try pull file with designer endpoint
            using HttpResponseMessage pullResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/pull");
            Assert.Equal(HttpStatusCode.OK, pullResponse.StatusCode);

            // Add a new file and try to push with designer
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test3.txt", "I am a new file created directly with gitea");
            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent);
            Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);
            await VerifyStudioNoteAddedToLatestCommit(org, targetRepo);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task LocalAndStudioDevelopment_BeginEditAndPullLocalCommit(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);
            await VerifyStudioNoteAddedToLatestCommit(org, targetRepo);

            // Create a file using gitea client
            using var createFileContent = new StringContent(GenerateCommitJsonPayload("I am a new file created in gitea", "test gitea commit"), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage createFileResponse = await GiteaFixture.GiteaClient.Value.PostAsync($"repos/{org}/{targetRepo}/contents/test2.txt", createFileContent);
            Assert.Equal(HttpStatusCode.Created, createFileResponse.StatusCode);

            // Add a new file and try to push with designer
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test3.txt", "I am a new file created directly with gitea");

            // Try pull file with designer endpoint
            using HttpResponseMessage pullResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/pull");
            Assert.Equal(HttpStatusCode.OK, pullResponse.StatusCode);


            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent);
            Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);
            await VerifyStudioNoteAddedToLatestCommit(org, targetRepo);
        }

        private async Task VerifyStudioNoteAddedToLatestCommit(string org, string targetRepo)
        {
            // Check if note is added to a commit
            using HttpResponseMessage getCommitResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/latest-commit");
            Commit commit = await getCommitResponse.Content.ReadAsAsync<Commit>();

            var noteResponse = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{targetRepo}/git/notes/{commit.Sha}");

            var notesNode = JsonNode.Parse(await noteResponse.Content.ReadAsStringAsync());
            Assert.Equal("studio-commit", notesNode!["message"]!.ToString());
        }
    }
}
