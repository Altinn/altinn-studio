﻿using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class SaveFormLayoutTestsBase : DisagnerEndpointsTestsBase<SaveFormLayoutTestsBase>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";
        public SaveFormLayoutTestsBase(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "testLayout", "layoutSet1", "TestData/App/ui/layoutWithUnknownProperties.json")]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "testLayout", "layoutSet1", "TestData/App/ui/changename/layouts/form.json")]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "testLayout", "layoutSet1", "TestData/App/ui/changename/layouts/summary.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/layoutWithUnknownProperties.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/changename/layouts/form.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/changename/layouts/summary.json")]
        // [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/datalist/layouts/formLayout.json")]
        // [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/datalist/layouts/summary.json")]
        // [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/group/layouts/hide.json")]
        // [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/group/layouts/prefill.json")]
        // [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/group/layouts/repeating.json")]
        // [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/group/layouts/summary.json")]
        // [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/likert/layouts/formLayout.json")]
        // [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/message/layouts/formLayout.json")]
        public async Task SaveFormLayout_ReturnsOk(string org, string app, string developer, string layoutName, string layoutSetName, string layoutPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout/{layoutName}?layoutSetName={layoutSetName}";

            string layout = SharedResourcesHelper.LoadTestDataAsString(layoutPath);

            var payload = new JsonObject
            {
                ["componentIdChange"] = new JsonObject
                {
                    ["oldComponentId"] = "Test",
                    ["newComponentId"] = "Test2",
                },

                ["layout"] = JsonNode.Parse(layout)
            };

            string jsonPayload = payload.ToJsonString();

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string relativePath = string.IsNullOrEmpty(layoutSetName)
                ? $"App/ui/layouts/{layoutName}.json"
                : $"App/ui/{layoutSetName}/layouts/{layoutName}.json";
            string savedLayout = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, relativePath);
            JsonUtils.DeepEquals(layout, savedLayout).Should().BeTrue();
        }

    }
}
