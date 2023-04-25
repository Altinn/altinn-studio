using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController
{
    public class CreateApplicationMetadataTests : ApplicationMetadataControllerTestsBase<CreateApplicationMetadataTests>
    {

        public CreateApplicationMetadataTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ApplicationMetadataController> factory) : base(factory)
        {
        }


        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser")]
        public async Task CreateApplicationMetadata_WhenExists_ShouldReturnConflict(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = VersionPrefix(org, targetRepository);
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, url);
            var response = await HttpClient.Value.SendAsync(request);

            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser")]
        public async Task CreateApplicationMetadata_ShouldReturnOK(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);
            string metadataPath = Path.Combine(CreatedFolderPath, "App", "config", "applicationmetadata.json");
            File.Delete(metadataPath);


            string url = VersionPrefix(org, targetRepository);
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, url);
            var response = await HttpClient.Value.SendAsync(request);

            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

    }
}
