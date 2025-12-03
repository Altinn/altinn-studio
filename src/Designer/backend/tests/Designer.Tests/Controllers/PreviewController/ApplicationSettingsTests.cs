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
    public class ApplicationSettingsTests : PreviewControllerTestsBase<ApplicationSettingsTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public ApplicationSettingsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_ApplicationSettings_Ok()
        {
            string dataPathWithData = $"{Org}/{PreviewApp}/api/v1/applicationsettings";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            ApplicationSettings applicationSettings = JsonConvert.DeserializeObject<ApplicationSettings>(responseDocument.RootElement.ToString());
            Assert.Equal("ttd/preview-app", applicationSettings.Id);
            Assert.Equal("ttd", applicationSettings.Org);
            Assert.Equal("preview-app", applicationSettings.Title["nb"]);
        }
    }
}
