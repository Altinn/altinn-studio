using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class ValidateInstantiationTests : PreviewControllerTestsBase<ValidateInstantiationTests>
    {

        public ValidateInstantiationTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Post_ValidateInstantiation_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/parties/validateInstantiation";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(@"{""valid"": true}", responseBody).Should().BeTrue();
        }
    }
}
