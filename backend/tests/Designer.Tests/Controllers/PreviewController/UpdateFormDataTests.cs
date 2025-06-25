using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class UpdateFormDataTests : PreviewControllerTestsBase<UpdateFormDataTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public UpdateFormDataTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Put_UpdateFormData_Ok()
        {
            string dataPathWithData = $"{Org}/{AppV3Path}/instances/{PartyId}/{V3InstanceId}/data/";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status201Created, (int)response.StatusCode);
        }
    }
}
