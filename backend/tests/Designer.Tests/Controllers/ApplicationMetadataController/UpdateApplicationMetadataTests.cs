using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController
{
    public class UpdateApplicationMetadataTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.ApplicationMetadataController, UpdateApplicationMetadataTests>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/metadata";
        public UpdateApplicationMetadataTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ApplicationMetadataController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser", "App/config/applicationmetadata.json")]
        public async Task UpdateApplicationMetadata_WhenExists_ShouldReturnConflict(string org, string app, string developer, string metadataToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string metadata = SharedResourcesHelper.LoadTestDataAsString(metadataToUpdate);
            string expectedMetadataJson = JsonSerializer.Serialize(JsonSerializer.Deserialize<Application>(metadata, JsonSerializerOptions), JsonSerializerOptions);

            string url = VersionPrefix(org, targetRepository);

            var response = await HttpClient.Value.PutAsync(url, new StringContent(metadata, Encoding.UTF8, MediaTypeNames.Application.Json));

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string responseContent = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedMetadataJson, responseContent).Should().BeTrue();
            string fileFromRepo = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
            JsonUtils.DeepEquals(expectedMetadataJson, fileFromRepo).Should().BeTrue();
        }
    }
}
