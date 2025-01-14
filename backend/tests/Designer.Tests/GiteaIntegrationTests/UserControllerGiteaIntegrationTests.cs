﻿using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using FluentAssertions;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests
{
    public class UserControllerGiteaIntegrationTests : GiteaIntegrationTestsBase<UserControllerGiteaIntegrationTests>
    {
        public UserControllerGiteaIntegrationTests(GiteaWebAppApplicationFactoryFixture<Program> factory,
            GiteaFixture giteaFixture, SharedDesignerHttpClientProvider sharedDesignerHttpClientProvider) : base(
            factory, giteaFixture, sharedDesignerHttpClientProvider)
        {
        }

        [Theory]
        [InlineData(GiteaConstants.TestUser, GiteaConstants.TestUserEmail)]
        public async Task GetCurrentUser_ShouldReturnOk(string expectedUserName, string expectedEmail)
        {
            string requestUrl = "designer/api/user/current";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, requestUrl);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            response.Headers.First(h => h.Key == "Set-Cookie").Value.Should().Contain(e => e.Contains("XSRF-TOKEN"));
            string content = await response.Content.ReadAsStringAsync();
            var user = JsonSerializer.Deserialize<User>(content,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            user.Login.Should().Be(expectedUserName);
            user.Email.Should().Be(expectedEmail);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task UserRepos_ShouldReturnOk(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName();
            await CreateAppUsingDesigner(org, targetRepo);

            string requestUrl = "designer/api/user/repos";
            using var response = await HttpClient.GetAsync(requestUrl);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsAsync<List<Repository>>();
            content.Should().NotBeNull();
            content.Should().Contain(r => r.Name == targetRepo);
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername)]
        public async Task StarredEndpoints_ShouldBehaveAsExpected(string org)
        {
            string targetRepo = TestDataHelper.GenerateTestRepoName();
            await CreateAppUsingDesigner(org, targetRepo);

            using var putStarredResponse =
                await HttpClient.PutAsync($"designer/api/user/starred/{org}/{targetRepo}", null);
            putStarredResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
            await GetAndVerifyStarredRepos(targetRepo);

            using var deleteStarredResponse =
                await HttpClient.DeleteAsync($"designer/api/user/starred/{org}/{targetRepo}");
            deleteStarredResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

            await GetAndVerifyStarredRepos();
        }

        [Theory]
        [InlineData(GiteaConstants.TestOrgUsername, true)]
        [InlineData("OtherOrg", false)]
        public async Task HasAccessToCreateRepository_ShouldReturnCorrectPermissions(string org, bool expectedCanCreate)
        {
            string requestUrl = $"designer/api/user/org-permissions/{org}";

            using var response = await HttpClient.GetAsync(requestUrl);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string content = await response.Content.ReadAsStringAsync();
            var deserializeOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            };

            var userOrgPermission = JsonSerializer.Deserialize<Team>(content, deserializeOptions);

            userOrgPermission.Should().NotBeNull();
            userOrgPermission.CanCreateOrgRepo.Should().Be(expectedCanCreate);
        }

        private async Task GetAndVerifyStarredRepos(params string[] expectedStarredRepos)
        {
            using var response = await HttpClient.GetAsync("designer/api/user/starred");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsAsync<List<Repository>>();
            content.Should().NotBeNull().And.HaveCount(expectedStarredRepos.Length);
            foreach (string expectedStarredRepo in expectedStarredRepos)
            {
                content.Should().Contain(r => r.Name == expectedStarredRepo);
            }
        }
    }
}
