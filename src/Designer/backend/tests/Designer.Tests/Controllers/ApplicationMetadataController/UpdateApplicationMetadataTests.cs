using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
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
    public class UpdateApplicationMetadataTests : DesignerEndpointsTestsBase<UpdateApplicationMetadataTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/metadata";
        public UpdateApplicationMetadataTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser", "App/config/applicationmetadata.json")]
        public async Task UpdateApplicationMetadata_WhenExists_ShouldReturnConflict(string org, string app, string developer, string metadataToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string metadata = SharedResourcesHelper.LoadTestDataAsString(metadataToUpdate);
            string expectedMetadataJson = JsonSerializer.Serialize(JsonSerializer.Deserialize<ApplicationMetadata>(metadata, JsonSerializerOptions), JsonSerializerOptions);

            string url = VersionPrefix(org, targetRepository);

            using var response = await HttpClient.PutAsync(url, new StringContent(metadata, Encoding.UTF8, MediaTypeNames.Application.Json));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.True(JsonUtils.DeepEquals(expectedMetadataJson, responseContent));
            string fileFromRepo = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
            Assert.True(JsonUtils.DeepEquals(expectedMetadataJson, fileFromRepo));
        }
    }
}
