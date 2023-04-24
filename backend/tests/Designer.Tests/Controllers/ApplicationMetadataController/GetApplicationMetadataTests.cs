using System.IO;
using System.Net;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController
{
    public class GetApplicationMetadataTests : ApplicationMetadataControllerTestsBase<GetApplicationMetadataTests>
    {

        public GetApplicationMetadataTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ApplicationMetadataController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser", "App/config/applicationmetadata.json")]
        public async Task GetApplicationMetadata_ShouldReturnOK(string org, string app, string developer, string metadataPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            // replace metadata file
            var metadataFile = SharedResourcesHelper.LoadTestDataAsString(metadataPath);
            string filePath = Path.Combine(CreatedFolderPath, "App", "config", "applicationmetadata.json");
            await File.WriteAllTextAsync(filePath, metadataFile);

            string url = VersionPrefix(org, targetRepository);
            var response = await HttpClient.Value.GetAsync(url);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string responseContent = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(metadataFile, responseContent).Should().BeTrue();
        }
    }
}
