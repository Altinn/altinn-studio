using System.Net;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetOptionsTests : PreviewControllerTestsBase<GetOptionsTests>
    {

        public GetOptionsTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_Options_when_options_exists_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/options/test-options";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            string responseStringWithoutWhitespaces = Regex.Replace(responseBody, @"\s", "");
            Assert.Equal(@"[{""label"":""label1"",""value"":""value1""},{""label"":""label2"",""value"":""value2""}]", responseStringWithoutWhitespaces);
        }

        [Fact]
        public async Task Get_Options_when_options_exists_for_stateful_app_Ok()
        {
            string dataPathWithData = $"{Org}/{StatefulApp}/instances/{PartyId}/{InstanceGuId}/options/test-options";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            string responseStringWithoutWhitespaces = Regex.Replace(responseBody, @"\s", "");
            Assert.Equal(@"[{""label"":""label1"",""value"":""value1""},{""label"":""label2"",""value"":""value2""}]", responseStringWithoutWhitespaces);
        }

        [Fact]
        public async Task Get_Options_when_no_options_exist_returns_NoContent()
        {
            string dataPathWithData = $"{Org}/{App}/api/options/non-existing-options";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.Equal("", responseBody);
        }
    }
}
