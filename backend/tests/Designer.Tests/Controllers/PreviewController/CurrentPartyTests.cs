using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Register.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class CurrentPartyTests : PreviewControllerTestsBase<CurrentPartyTests>
    {

        public CurrentPartyTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_CurrentParty_Ok()
        {
            string dataPathWithData = $"{Org}/{App}/api/authorization/parties/current";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Party currentParty = JsonConvert.DeserializeObject<Party>(responseDocument.RootElement.ToString());
            Assert.Equal(51001, currentParty.PartyId);
        }
    }
}
