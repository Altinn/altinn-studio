using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class ValidateInstantiationTests : PreviewControllerTestsBase<ValidateInstantiationTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public ValidateInstantiationTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Post_ValidateInstantiation_Ok()
        {
            string dataPathWithData = $"{Org}/{AppV4}/api/v1/parties/validateInstantiation";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.True(JsonUtils.DeepEquals(@"{""valid"": true}", responseBody));
        }
    }
}
