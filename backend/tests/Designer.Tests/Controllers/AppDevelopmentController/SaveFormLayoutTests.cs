using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class SaveFormLayoutTestsBase(WebApplicationFactory<Program> factory)
        : DesignerEndpointsTestsBase<SaveFormLayoutTestsBase>(factory), IClassFixture<WebApplicationFactory<Program>>
    {

        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";

        private static readonly JsonSerializerOptions s_jsonOptions = new()
        {
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "testLayout", "layoutSet1", "TestData/App/ui/layoutWithUnknownProperties.json")]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "testLayout", "layoutSet1", "TestData/App/ui/changename/layouts/form.json")]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "testLayout", "layoutSet1", "TestData/App/ui/changename/layouts/summary.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/layoutWithUnknownProperties.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/changename/layouts/form.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/changename/layouts/summary.json")]
        public async Task SaveFormLayout_ReturnsOk(string org, string app, string developer, string layoutName, string layoutSetName, string layoutPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout/{layoutName}?layoutSetName={layoutSetName}";

            string layout = SharedResourcesHelper.LoadTestDataAsString(layoutPath);

            var payload = new JsonObject
            {
                ["componentIdsChange"] = null,
                ["layout"] = JsonNode.Parse(layout)
            };
            HttpResponseMessage response = await SendHttpRequest(url, payload);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string relativePath = string.IsNullOrEmpty(layoutSetName)
                ? $"App/ui/layouts/{layoutName}.json"
                : $"App/ui/{layoutSetName}/layouts/{layoutName}.json";
            string savedLayout = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, relativePath);
            JsonUtils.DeepEquals(layout, savedLayout).Should().BeTrue();
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "testLayout", "layoutSet1", "TestData/App/ui/layoutWithUnknownProperties.json")]
        [InlineData("ttd", "empty-app", "testUser", "testLayout", null, "TestData/App/ui/changename/layouts/summary.json")]
        public async Task SaveFormLayoutWithComponentIdsChange_ReturnsOk(string org, string app, string developer, string layoutName, string layoutSetName, string layoutPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout/{layoutName}?layoutSetName={layoutSetName}";

            string layout = SharedResourcesHelper.LoadTestDataAsString(layoutPath);

            var payload = new JsonObject
            {
                ["componentIdsChange"] = new JsonArray() { new JsonObject
                {
                    ["oldComponentId"] = "Test",
                    ["newComponentId"] = "Test2",
                }},
                ["layout"] = JsonNode.Parse(layout)
            };
            HttpResponseMessage response = await SendHttpRequest(url, payload);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string relativePath = string.IsNullOrEmpty(layoutSetName)
                ? $"App/ui/layouts/{layoutName}.json"
                : $"App/ui/{layoutSetName}/layouts/{layoutName}.json";
            string savedLayout = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, relativePath);
            JsonUtils.DeepEquals(layout, savedLayout).Should().BeTrue();
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "testLayout", "layoutSet1", "TestData/App/ui/layoutWithUnknownProperties.json")]
        public async Task SaveFormLayoutWithNewPageLanguageUpdate_ReturnsOk(string org, string app, string developer, string layoutName, string layoutSetName, string layoutPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string url = $"{VersionPrefix(org, targetRepository)}/form-layout/{layoutName}?layoutSetName={layoutSetName}";
            string layout = SharedResourcesHelper.LoadTestDataAsString(layoutPath);

            TestDataHelper.FileExistsInRepo(org, targetRepository, developer, "App/config/texts/resource.nb.json").Should().BeTrue();
            string file = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/texts/resource.nb.json");
            TextResource textResource = JsonSerializer.Deserialize<TextResource>(file, s_jsonOptions);
            textResource.Resources.Should().NotContain(x => x.Id == "next");
            textResource.Resources.Should().NotContain(x => x.Id == "back");

            var payload = new JsonObject
            {
                ["componentIdsChange"] = null,
                ["layout"] = JsonNode.Parse(layout)
            };
            HttpResponseMessage response = await SendHttpRequest(url, payload);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string newTextFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/config/texts/resource.nb.json");
            TextResource newTextResource = JsonSerializer.Deserialize<TextResource>(newTextFile, s_jsonOptions);
            newTextResource.Resources.Should().ContainSingle(x => x.Id == "next");
            newTextResource.Resources.Should().ContainSingle(x => x.Id == "back");
        }

        private async Task<HttpResponseMessage> SendHttpRequest(string url, JsonObject payload)
        {
            string jsonPayload = payload.ToJsonString();
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeNames.Application.Json)
            };
            HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            return response;
        }
    }
}
