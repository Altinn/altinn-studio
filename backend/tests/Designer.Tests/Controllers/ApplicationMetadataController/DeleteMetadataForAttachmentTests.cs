using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController
{
    public class DeleteMetadataForAttachmentTests : ApplicationMetadataControllerTestsBase<DeleteMetadataForAttachmentTests>
    {

        public DeleteMetadataForAttachmentTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ApplicationMetadataController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser", "ref-data-as-pdf")]
        public async Task UpdateApplicationMetadata_WhenExists_ShouldReturnConflict(string org, string app, string developer, string attacmentIdToDelete)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);
            string previousMetadata = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
            Application applicationMetadataPreDelete = JsonSerializer.Deserialize<Application>(previousMetadata, JsonSerializerOptions);
            Assert.Contains(applicationMetadataPreDelete.DataTypes, x => x.Id == attacmentIdToDelete);

            // Id should be parameter of the url instead of query parameter.
            string url = $"{VersionPrefix(org, targetRepository)}/attachment-component?id={attacmentIdToDelete}";

            using var requestMessage = new HttpRequestMessage(HttpMethod.Delete, url);
            requestMessage.Content = new StringContent(attacmentIdToDelete, Encoding.UTF8, MediaTypeNames.Application.Json);

            var response = await HttpClient.Value.SendAsync(requestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            string currentMetadata = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
            Application applicationMetadataAfterDelete = JsonSerializer.Deserialize<Application>(currentMetadata, JsonSerializerOptions);
            Assert.DoesNotContain(applicationMetadataAfterDelete.DataTypes, x => x.Id == attacmentIdToDelete);

        }


    }
}
