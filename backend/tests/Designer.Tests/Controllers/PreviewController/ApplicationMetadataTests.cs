using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class ApplicationMetadataTests : PreviewControllerTestsBase<ApplicationMetadataTests>
    {

        public ApplicationMetadataTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_ApplicationMetadata_Ok()
        {
            string expectedApplicationMetadata = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/config/applicationmetadata.json");

            string dataPathWithData = $"{Org}/{App}/api/v1/applicationmetadata";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            string expectedJson = JsonSerializer.Serialize(JsonSerializer.Deserialize<Application>(expectedApplicationMetadata, SerializerOptions), SerializerOptions);
            JsonUtils.DeepEquals(expectedJson, responseBody).Should().BeTrue();
        }
    }
}
