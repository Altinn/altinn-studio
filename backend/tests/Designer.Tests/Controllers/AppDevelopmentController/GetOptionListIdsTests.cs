﻿using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetOptionListIdsTests : DesignerEndpointsTestsBase<GetOptionListIdsTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";
        public GetOptionListIdsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-options", "testUser")]
        public async Task GetOptionsListIds_ShouldReturnOk(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            var expectedOptionsListIds = new List<string>()
            {
                { "other-options" },
                { "test-options" },
                { "options-with-null-fields" },
            };

            string url = $"{VersionPrefix(org, targetRepository)}/option-list-ids";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseContent = await response.Content.ReadAsStringAsync();
            List<string> responseList = JsonSerializer.Deserialize<List<string>>(responseContent);
            Assert.Equal(3, responseList.Count);
            foreach (string id in expectedOptionsListIds)
            {
                Assert.Contains(id, responseList);
            }
        }

        [Theory]
        [InlineData("ttd", "empty-app")]
        public async Task GetOptionsListIds_WhenNotExists_ReturnsNotFound(string org, string app)
        {
            string url = $"{VersionPrefix(org, app)}/option-list-ids";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }
    }
}
