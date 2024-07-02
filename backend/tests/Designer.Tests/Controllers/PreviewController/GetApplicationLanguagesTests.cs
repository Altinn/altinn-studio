using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetApplicationLanguagesTests : PreviewControllerTestsBase<GetApplicationLanguagesTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetApplicationLanguagesTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_ApplicationLanguages_Ok()
        {
            string dataPathWithData = $"{Org}/{PreviewApp}/api/v1/applicationlanguages";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.Equal(@"[{""language"":""en""},{""language"":""nb""}]", responseBody);
        }
    }
}
