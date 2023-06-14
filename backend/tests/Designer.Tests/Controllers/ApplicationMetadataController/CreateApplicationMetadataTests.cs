using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController
{
    public class CreateApplicationMetadataTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.ApplicationMetadataController, CreateApplicationMetadataTests>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/metadata";
        public CreateApplicationMetadataTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ApplicationMetadataController> factory) : base(factory)
        {
        }


        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser")]
        public async Task CreateApplicationMetadata_WhenExists_ShouldReturnConflict(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = VersionPrefix(org, targetRepository);
            using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, url);
            using var response = await HttpClient.Value.SendAsync(request);

            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser")]
        public async Task CreateApplicationMetadata_ShouldReturnOK(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string metadataPath = Path.Combine(CreatedFolderPath, "App", "config", "applicationmetadata.json");
            File.Delete(metadataPath);


            string url = VersionPrefix(org, targetRepository);
            using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, url);
            using var response = await HttpClient.Value.SendAsync(request);

            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

    }
}
