using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Polly;
using Polly.Retry;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests.RepositoryController
{
    public class RepositoryControllerGiteaIntegrationTests : GiteaIntegrationTestsBase<RepositoryControllerGiteaIntegrationTests>
    {

        // Gitea needs some time to process changes to the repo, so we need to retry a few times
        private readonly AsyncRetryPolicy<HttpResponseMessage> _giteaRetryPolicy = Policy.HandleResult<HttpResponseMessage>(x => x.StatusCode != HttpStatusCode.OK)
            .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(retryAttempt));

        public RepositoryControllerGiteaIntegrationTests(GiteaWebAppApplicationFactoryFixture<Program> factory, GiteaFixture giteaFixture, SharedDesignerHttpClientProvider sharedDesignerHttpClientProvider) : base(factory, giteaFixture, sharedDesignerHttpClientProvider)
        {
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task CreateRepo_ShouldBeAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Check if repo is created in gitea
            var giteaResponse = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{targetRepo}");
            Assert.Equal(HttpStatusCode.OK, giteaResponse.StatusCode);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task Commit_AndPush_AndContents_ShouldBeAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Add a file to local repo and try to push with designer
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test.txt", "I am a new file");

            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent);
            Assert.Equal(HttpStatusCode.OK, commitAndPushResponse.StatusCode);

            // Check if file is pushed to gitea
            var giteaFileResponse = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{targetRepo}/contents/test.txt");
            Assert.Equal(HttpStatusCode.OK, giteaFileResponse.StatusCode);

            // Check contents with designer endpoint
            using HttpResponseMessage contentsResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/contents?path=test.txt");
            Assert.Equal(HttpStatusCode.OK, contentsResponse.StatusCode);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task Commit_AndPush_Separate_ShouldBeAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Try combination of commit and push endpoints separately
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test3.txt", "I am a new file");
            using var commitContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit", commitContent);
            Assert.Equal(HttpStatusCode.OK, commitResponse.StatusCode);

            using HttpResponseMessage pushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/push", null);
            Assert.Equal(HttpStatusCode.OK, pushResponse.StatusCode);

            // Check if file is pushed to gitea
            var giteaFileResponse2 = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{targetRepo}/contents/test3.txt");
            Assert.Equal(HttpStatusCode.OK, giteaFileResponse2.StatusCode);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task Pull_ShouldBeAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Create a file in gitea
            using var createFileContent = new StringContent(GenerateCommitJsonPayload("I am a new file created in gitea", "test commit"), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage createFileResponse = await GiteaFixture.GiteaClient.Value.PostAsync($"repos/{org}/{targetRepo}/contents/test2.txt", createFileContent);
            Assert.Equal(HttpStatusCode.Created, createFileResponse.StatusCode);

            // Try pull file with designer endpoint
            using HttpResponseMessage pullResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/pull");
            Assert.Equal(HttpStatusCode.OK, pullResponse.StatusCode);

            // Check if file exists locally
            Assert.True(File.Exists($"{CreatedFolderPath}/test2.txt"));
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task MetadataAndStatus_ShouldBehaveAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Call metadata endpoint
            using HttpResponseMessage metadataResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/metadata");
            Assert.Equal(HttpStatusCode.OK, metadataResponse.StatusCode);
            var deserializedRepositoryModel = await metadataResponse.Content.ReadAsAsync<Repository>();
            Assert.Equal(targetRepo, deserializedRepositoryModel.Name);

            // Call status endpoint
            using HttpResponseMessage statusResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/status");
            Assert.Equal(HttpStatusCode.OK, statusResponse.StatusCode);
            var deserializedRepoStatusModel = await statusResponse.Content.ReadAsAsync<RepoStatus>();
            Assert.Equal(RepositoryStatus.Ok, deserializedRepoStatusModel.RepositoryStatus);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task RepoStatus_ShouldReturn404NotFoundWhenInvalidRepo(string org)
        {
            // Call status endpoint
            using HttpResponseMessage statusResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/123/status");
            Assert.Equal(HttpStatusCode.NotFound, statusResponse.StatusCode);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task GetOrgRepos_ShouldBehaveAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Call getOrgRepos endpoint
            using HttpResponseMessage getOrgReposResponse = await HttpClient.GetAsync($"designer/api/repos/org/{org}");
            Assert.Equal(HttpStatusCode.OK, getOrgReposResponse.StatusCode);
            var deserializedRepositoryModel = await getOrgReposResponse.Content.ReadAsAsync<List<Repository>>();

            Assert.NotEmpty(deserializedRepositoryModel);
            Assert.Contains(deserializedRepositoryModel, x => x.Name == targetRepo);
        }

        // Get branch endpoint test
        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task GetBranch_ShouldBehaveAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Call branch endpoint
            using HttpResponseMessage branchResponse = await _giteaRetryPolicy.ExecuteAsync(async () => await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/branches/branch?branch=master"));
            var deserializedBranchModel = await branchResponse.Content.ReadAsAsync<Branch>();
            Assert.Equal(HttpStatusCode.OK, branchResponse.StatusCode);
            Assert.Equal("master", deserializedBranchModel.Name);
        }

        // Get branches endpoint test
        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task GetBranches_ShouldBehaveAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Call branch endpoint
            using HttpResponseMessage branchResponse = await _giteaRetryPolicy.ExecuteAsync(async () => await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/branches"));
            var deserializedBranchModel = await branchResponse.Content.ReadAsAsync<Branch[]>();
            Assert.Equal(HttpStatusCode.OK, branchResponse.StatusCode);
            Assert.NotEmpty(deserializedBranchModel);
            Assert.Contains(deserializedBranchModel, x => x.Name == "master");
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task PushWithConflictingChangesRemotely_ShouldReturnConflict(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Create a file in gitea
            using var createFileContent = new StringContent(GenerateCommitJsonPayload("I am a new file created in gitea", "test commit"), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage createFileResponse = await GiteaFixture.GiteaClient.Value.PostAsync($"repos/{org}/{targetRepo}/contents/fileAlreadyInRepository.txt", createFileContent);
            Assert.Equal(HttpStatusCode.Created, createFileResponse.StatusCode);

            // Add a file to local repo and try to push with designer
            await File.WriteAllTextAsync($"{CreatedFolderPath}/fileAlreadyInRepository.txt", "I am a new file from studio.");
            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent);
            Assert.Equal(HttpStatusCode.Conflict, commitAndPushResponse.StatusCode);
        }
    }
}
