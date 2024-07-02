using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class LanguageTests : PreviewControllerTestsBase<LanguageTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public LanguageTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_Text_Ok()
        {
            string dataPathWithData = $"{Org}/{PreviewApp}/api/v1/texts/nb";

            using HttpResponseMessage response = await HttpClient.GetAsync(dataPathWithData);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            TextResource text = JsonConvert.DeserializeObject<TextResource>(responseDocument.RootElement.ToString());
            Assert.Equal("nb", text.Language);
        }
    }
}
