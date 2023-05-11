using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests
{
    public class GitManipulationIntegrationTests : GiteaIntegrationTestsBase<RepositoryController, GitManipulationIntegrationTests>
    {

        public GitManipulationIntegrationTests(WebApplicationFactory<RepositoryController> factory, GiteaFixture giteaFixture) : base(factory, giteaFixture)
        {
        }

        [Theory]
        [Trait("Category", "GiteaIntegrationTest")]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task GiteaManipulation_ShouldBeAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            CreatedFolderPath = $"{TestRepositoriesLocation}/{GiteaConstants.TestUser}/{org}/{targetRepo}";

            // Create repo with designer
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
                HttpMethod.Post,
                $"designer/api/repos/create-app?org={org}&repository={targetRepo}");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.Created);

            // Check if repo is created in gitea
            var giteaResponse = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{targetRepo}");
            giteaResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Add a file to local repo and try to push with designer
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test.txt", "I am a new file");

            InvalidateAllCookies();
            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.Value.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent);
            commitAndPushResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Check if file is pushed to gitea
            var giteaFileResponse = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{targetRepo}/contents/test.txt");
            giteaFileResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Create a file in gitea
            using var createFileContent = new StringContent(CreateFileJsonPayload("I am a new file created in gitea", "test commit"), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage createFileResponse = await GiteaFixture.GiteaClient.Value.PostAsync($"repos/{org}/{targetRepo}/contents/test2.txt", createFileContent);
            createFileResponse.StatusCode.Should().Be(HttpStatusCode.Created);

            // Try pull file with designer endpoint
            InvalidateAllCookies();
            using HttpResponseMessage pullResponse = await HttpClient.Value.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/pull");
            pullResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Check if file exists locally
            File.Exists($"{CreatedFolderPath}/test2.txt").Should().BeTrue();

            // Try combination of commit and push endpoints separately
            InvalidateAllCookies();
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test3.txt", "I am a new file");
            using var commitContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitResponse = await HttpClient.Value.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit", commitContent);
            commitResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            InvalidateAllCookies();
            using HttpResponseMessage pushResponse = await HttpClient.Value.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/push", null);
            pushResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Check if file is pushed to gitea
            var giteaFileResponse2 = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{targetRepo}/contents/test3.txt");
            giteaFileResponse2.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        private static string GetCommitInfoJson(string text, string org, string repository) =>
            @$"{{
                ""message"": ""{text}"",
                ""org"": ""{org}"",
                ""repository"": ""{repository}""
            }}";

        private static string CreateFileJsonPayload(string text, string message) =>
            @$"{{
                 ""author"": {{
                     ""email"": ""{GiteaConstants.AdminEmail}"",
                     ""name"": ""{GiteaConstants.AdminUser}""
                 }},
                 ""committer"": {{
                     ""email"": ""{GiteaConstants.AdminEmail}"",
                     ""name"": ""{GiteaConstants.AdminUser}""
                 }},
                 ""content"": ""{Convert.ToBase64String(Encoding.UTF8.GetBytes(text))}"",
                 ""dates"": {{
                     ""author"": ""{DateTime.Now:O}"",
                     ""committer"": ""{DateTime.Now:O}""
                 }},
                 ""message"": ""{message}"",
                 ""signoff"": true
            }}";
    }
}
