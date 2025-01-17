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
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController
{
    public class DeleteMetadataForAttachmentTests : DesignerEndpointsTestsBase<DeleteMetadataForAttachmentTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/metadata";
        public DeleteMetadataForAttachmentTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser", "ref-data-as-pdf")]
        public async Task DeleteMetadataForAttachment_WhenExists_ShouldReturnOk(string org, string app, string developer, string attacmentIdToDelete)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string previousMetadata = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
            ApplicationMetadata applicationMetadataPreDelete = JsonSerializer.Deserialize<ApplicationMetadata>(previousMetadata, JsonSerializerOptions);
            Assert.Contains(applicationMetadataPreDelete.DataTypes, x => x.Id == attacmentIdToDelete);
            string url = $"{VersionPrefix(org, targetRepository)}/attachment-component";

            using var requestMessage = new HttpRequestMessage(HttpMethod.Delete, url);
            requestMessage.Content = new StringContent($"\"{attacmentIdToDelete}\"", Encoding.UTF8, MediaTypeNames.Application.Json);

            var response = await HttpClient.SendAsync(requestMessage);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string currentMetadata = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
            ApplicationMetadata applicationMetadataAfterDelete = JsonSerializer.Deserialize<ApplicationMetadata>(currentMetadata, JsonSerializerOptions);
            Assert.DoesNotContain(applicationMetadataAfterDelete.DataTypes, x => x.Id == attacmentIdToDelete);
        }
    }
}
