using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Designer.Tests.Fixtures;
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
        [InlineData(GiteaConstants.TestOrgUsername, "test-repo-some-repo")]
        public async Task CreateApp_ShouldCreateRepo(string org, string repository)
        {
            string requestUrl = $"designer/api/repos/create-app?org={org}&repository={repository}";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUrl);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.Created);

            // check if repo is created in gitea
            var giteaResponse = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{repository}");
            giteaResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }
}
