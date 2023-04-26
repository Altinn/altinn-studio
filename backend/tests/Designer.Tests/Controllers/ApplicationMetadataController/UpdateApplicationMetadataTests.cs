using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController
{
    public class UpdateApplicationMetadataTests : ApplicationMetadataControllerTestsBase<UpdateApplicationMetadataTests>
    {

        public UpdateApplicationMetadataTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ApplicationMetadataController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser", "App/config/applicationmetadata.json")]
        public async Task UpdateApplicationMetadata_WhenExists_ShouldReturnConflict(string org, string app, string developer, string metadataToUpdate)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedMetadata = SharedResourcesHelper.LoadTestDataAsString(metadataToUpdate);

            string url = VersionPrefix(org, targetRepository);

            var response = await HttpClient.Value.PutAsync(url, new StringContent(expectedMetadata, Encoding.UTF8, MediaTypeNames.Application.Json));

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string responseContent = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedMetadata, responseContent).Should().BeTrue();
            string fileFromRepo = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
            JsonUtils.DeepEquals(expectedMetadata, fileFromRepo).Should().BeTrue();
        }
    }
}
