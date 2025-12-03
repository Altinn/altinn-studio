using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.App;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController
{
    public class GetApplicationMetadataTests : DesignerEndpointsTestsBase<GetApplicationMetadataTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/metadata";
        public GetApplicationMetadataTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser", "App/config/applicationmetadata.json")]
        public async Task GetApplicationMetadata_ShouldReturnOK(string org, string app, string developer, string metadataPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            // replace metadata file
            string metadataFile = SharedResourcesHelper.LoadTestDataAsString(metadataPath);
            string filePath = Path.Combine(TestRepoPath, "App", "config", "applicationmetadata.json");
            await File.WriteAllTextAsync(filePath, metadataFile);

            string url = VersionPrefix(org, targetRepository);
            var response = await HttpClient.GetAsync(url);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string responseContent = await response.Content.ReadAsStringAsync();
            string expectedJson = JsonSerializer.Serialize(JsonSerializer.Deserialize<ApplicationMetadata>(metadataFile, JsonSerializerOptions), JsonSerializerOptions);
            Assert.True(JsonUtils.DeepEquals(expectedJson, responseContent));
        }
    }
}
