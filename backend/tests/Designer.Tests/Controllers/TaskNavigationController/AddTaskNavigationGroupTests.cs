using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Mappers;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.TaskNavigationController
{
    public class AddTaskNavigationGroupTests(WebApplicationFactory<Program> factory) : DesignerEndpointsTestsBase<GetTaskNavigationTests>(factory), IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/task-navigation";

        [Theory]
        [InlineData("ttd", "app-with-groups-and-taskNavigation", "testUser")]
        public async Task AddTaskNavigationGroup_ShouldReturnNoContent(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = VersionPrefix(org, targetRepository);

            var payload = new TaskNavigationGroupDto()
            {
                TaskId = "TaskIdTest",
                TaskType = "TaskTypeTest",
                Name = "NameTest",
            };
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            string relativePath = "App/ui/layout-sets.json";

            string expectedFile = TestDataHelper.GetFileFromRepo(org, app, developer, relativePath);
            JsonNode expectedData = JsonNode.Parse(expectedFile)["uiSettings"]["taskNavigation"];
            expectedData.AsArray().Add(JsonNode.Parse(JsonSerializer.Serialize(payload.ToDomain())));

            string savedFile = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, relativePath);
            JsonNode savedData = JsonNode.Parse(savedFile)["uiSettings"]["taskNavigation"];

            Assert.True(JsonUtils.DeepEquals(expectedData.ToJsonString(), savedData.ToJsonString()));
        }
    }
}
