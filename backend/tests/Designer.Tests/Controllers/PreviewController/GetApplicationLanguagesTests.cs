using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetApplicationLanguagesTests : PreviewControllerTestsBase<GetApplicationLanguagesTests>
    {

        public GetApplicationLanguagesTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_ApplicationLanguages_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/v1/applicationlanguages";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.Equal(@"[{""language"":""en""},{""language"":""nb""}]", responseBody);
        }
    }
}
