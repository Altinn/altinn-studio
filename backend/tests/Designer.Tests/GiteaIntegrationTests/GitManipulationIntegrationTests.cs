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
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task CreateApp_ShouldCreateRepo(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            CreatedFolderPath = $"{TestRepositoriesLocation}/{GiteaConstants.TestUser}/{org}/{targetRepo}";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(
                HttpMethod.Post,
                $"designer/api/repos/create-app?org={org}&repository={targetRepo}");

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.Created);

            // check if repo is created in gitea
            var giteaResponse = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{targetRepo}");
            giteaResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Add a file to local repo and try to push with designer
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test.txt", "I am a new file");

            InvalidateAllCookies();
            var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.Value.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent);
            commitAndPushResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // check if file is pushed to gitea
            var giteaFileResponse = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{targetRepo}/contents/test.txt");
            giteaFileResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        }

        private static string GetCommitInfoJson(string text, string org, string repository) =>
                @$"{{
                    ""message"": ""{text}"",
                    ""org"": ""{org}"",
                    ""repository"": ""{repository}""
                }}";
    }
}
