using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Polly;
using Polly.Retry;
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
        [Trait("Category", "GiteaIntegrationTest")]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task Copy_Repo_Should_Return_Created(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            CopyRepoName = TestDataHelper.GenerateTestRepoName("-gitea-copy");

            // Copy app
            using HttpResponseMessage commitResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/copy-app?sourceRepository={targetRepo}&targetRepository={CopyRepoName}", null);
            commitResponse.StatusCode.Should().Be(HttpStatusCode.Created);
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
