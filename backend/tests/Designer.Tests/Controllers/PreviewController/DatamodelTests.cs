using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class DatamodelTests : PreviewControllerTestsBase<DatamodelTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public DatamodelTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_Datamodel_Ok()
        {
            string expectedDatamodel = TestDataHelper.GetFileFromRepo(Org, AppV3, Developer, "App/models/custom-dm-name.schema.json");

            string dataPathWithData = $"{Org}/{AppV3}/api/jsonschema/custom-dm-name";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedDatamodel, responseBody).Should().BeTrue();
        }

        [Fact]
        public async Task Get_Datamodel_MockedDataTypeId_OkWithDefaultDataModel()
        {
            // Expects to get a response that is a datamodel, but does not matter which, so returns the first data type in app metadata with a classRef
            string expectedDatamodel = TestDataHelper.GetFileFromRepo(Org, AppV4, Developer, "App/models/datamodel.schema.json");

            string dataPathWithData = $"{Org}/{AppV4}/api/jsonschema/{PreviewService.MockDataModelIdPrefix}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedDatamodel, responseBody).Should().BeTrue();
        }
    }
}
