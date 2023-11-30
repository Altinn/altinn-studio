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
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests.RepositoryController
{
    public class GitNotesGiteaIntegrationTests : GiteaIntegrationTestsBase<CopyAppGiteaIntegrationTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GitNotesGiteaIntegrationTests(WebApplicationFactory<Program> factory, GiteaFixture giteaFixture) : base(factory, giteaFixture)
        {
        }
        [Theory]
        [Trait("Category", "GiteaIntegrationTest")]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task Commit_AndPush_Separate_Should_Create_Git_Note(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Commmit and push separately
            InvalidateAllCookies();
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test3.txt", "I am a new file");
            using var commitContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit", commitContent);
            commitResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            InvalidateAllCookies();
            using HttpResponseMessage pushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/push", null);
            pushResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            await VerifyStudioNoteAddedToLatestCommit(org, targetRepo);
        }

        [Theory]
        [Trait("Category", "GiteaIntegrationTest")]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task Commit_AndPush_AndContents_Should_Ccreate_GitNote(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Add a file to local repo and try to push with designer
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test.txt", "I am a new file");

            InvalidateAllCookies();
            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent);
            commitAndPushResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            await VerifyStudioNoteAddedToLatestCommit(org, targetRepo);

        }

        private async Task VerifyStudioNoteAddedToLatestCommit(string org, string targetRepo)
        {
            InvalidateAllCookies();
            // Check if note is added to a commit
            using HttpResponseMessage getCommitResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/latest-commit");
            Commit commit = await getCommitResponse.Content.ReadAsAsync<Commit>();

            var noteResponse = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{targetRepo}/git/notes/{commit.Sha}");

            var notesNode = JsonNode.Parse(await noteResponse.Content.ReadAsStringAsync());
            notesNode!["message"]!.ToString().Should().Be("studio-commit");
        }
    }
}
