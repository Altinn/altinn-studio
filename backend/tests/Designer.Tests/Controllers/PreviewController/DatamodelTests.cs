using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class DatamodelTests : PreviewControllerTestsBase<DatamodelTests>
    {

        public DatamodelTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_Datamodel_Ok()
        {
            string expectedDatamodel = TestDataHelper.GetFileFromRepo(Org, App, Developer, "App/models/custom-dm-name.schema.json");

            string dataPathWithData = $"{Org}/{App}/api/jsonschema/custom-dm-name";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedDatamodel, responseBody).Should().BeTrue();
        }
    }
}
