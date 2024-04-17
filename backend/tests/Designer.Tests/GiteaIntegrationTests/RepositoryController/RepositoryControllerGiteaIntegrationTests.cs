﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Polly;
using Polly.Retry;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests.RepositoryController
{
    public class RepositoryControllerGiteaIntegrationTests : GiteaIntegrationTestsBase<RepositoryControllerGiteaIntegrationTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        // Gitea needs some time to process changes to the repo, so we need to retry a few times
        private readonly AsyncRetryPolicy<HttpResponseMessage> _giteaRetryPolicy = Policy.HandleResult<HttpResponseMessage>(x => x.StatusCode != HttpStatusCode.OK)
            .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(retryAttempt));

        public RepositoryControllerGiteaIntegrationTests(WebApplicationFactory<Program> factory, GiteaFixture giteaFixture) : base(factory, giteaFixture)
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
            giteaResponse.StatusCode.Should().Be(HttpStatusCode.OK);
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
            commitAndPushResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Check if file is pushed to gitea
            var giteaFileResponse = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{targetRepo}/contents/test.txt");
            giteaFileResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Check contents with designer endpoint
            using HttpResponseMessage contentsResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/contents?path=test.txt");
            contentsResponse.StatusCode.Should().Be(HttpStatusCode.OK);
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
            commitResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            using HttpResponseMessage pushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/push", null);
            pushResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Check if file is pushed to gitea
            var giteaFileResponse2 = await GiteaFixture.GiteaClient.Value.GetAsync($"repos/{org}/{targetRepo}/contents/test3.txt");
            giteaFileResponse2.StatusCode.Should().Be(HttpStatusCode.OK);
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
            createFileResponse.StatusCode.Should().Be(HttpStatusCode.Created);

            // Try pull file with designer endpoint
            using HttpResponseMessage pullResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/pull");
            pullResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Check if file exists locally
            File.Exists($"{CreatedFolderPath}/test2.txt").Should().BeTrue();
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task Initial_Commit_ShouldBeAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Check initial-commit endpoint
            using HttpResponseMessage initialCommitResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/initial-commit");
            initialCommitResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var commit = await initialCommitResponse.Content.ReadAsAsync<Commit>();
            commit.Message.Should().Contain("App created");
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task MetadataAndStatus_ShouldBehaveAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Call metadata endpoint
            using HttpResponseMessage metadataResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/metadata");
            metadataResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var deserializedRepositoryModel = await metadataResponse.Content.ReadAsAsync<Repository>();
            deserializedRepositoryModel.Name.Should().Be(targetRepo);

            // Call status endpoint
            using HttpResponseMessage statusResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/status");
            statusResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var deserializedRepoStatusModel = await statusResponse.Content.ReadAsAsync<RepoStatus>();
            deserializedRepoStatusModel.RepositoryStatus.Should().Be(RepositoryStatus.Ok);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task RepoStatus_ShouldReturn404NotFoundWhenInvalidRepo(string org)
        {
            // Call status endpoint
            using HttpResponseMessage statusResponse = await HttpClient.GetAsync($"designer/api/repos/repo/{org}/123/status");
            statusResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task GetOrgRepos_ShouldBehaveAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Call getOrgRepos endpoint
            using HttpResponseMessage getOrgReposResponse = await HttpClient.GetAsync($"designer/api/repos/org/{org}");
            getOrgReposResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var deserializedRepositoryModel = await getOrgReposResponse.Content.ReadAsAsync<List<Repository>>();
            deserializedRepositoryModel.Should().NotBeEmpty();
            deserializedRepositoryModel.Should().Contain(x => x.Name == targetRepo);
        }

        // Get branch endpoint test
        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task GetBranches_And_Branch_ShouldBehaveAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Call branches endpoint
            using HttpResponseMessage branchesResponse = await _giteaRetryPolicy.ExecuteAsync(async () => await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/branches"));
            branchesResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var deserializedBranchesModel = await branchesResponse.Content.ReadAsAsync<List<Branch>>();
            deserializedBranchesModel.Count.Should().Be(1);
            deserializedBranchesModel.First().Name.Should().Be("master");

            // Call branch endpoint
            using HttpResponseMessage branchResponse = await _giteaRetryPolicy.ExecuteAsync(async () => await HttpClient.GetAsync($"designer/api/repos/repo/{org}/{targetRepo}/branches/branch?branch=master"));
            branchResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }


        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task Commit_AndPush_NonPulled_ShouldReturnConflict(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName("-gitea");
            await CreateAppUsingDesigner(org, targetRepo);

            // Create a file in gitea
            using var createFileContent = new StringContent(GenerateCommitJsonPayload("I am a new file created in gitea", "test commit"), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage createFileResponse = await GiteaFixture.GiteaClient.Value.PostAsync($"repos/{org}/{targetRepo}/contents/test2.txt", createFileContent);
            createFileResponse.StatusCode.Should().Be(HttpStatusCode.Created);

            // Add a file to local repo and try to push with designer
            await File.WriteAllTextAsync($"{CreatedFolderPath}/test.txt", "I am a new file from studio.");
            using var commitAndPushContent = new StringContent(GetCommitInfoJson("test commit", org, targetRepo), Encoding.UTF8, MediaTypeNames.Application.Json);
            using HttpResponseMessage commitAndPushResponse = await HttpClient.PostAsync($"designer/api/repos/repo/{org}/{targetRepo}/commit-and-push", commitAndPushContent);
            commitAndPushResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }
    }
}
