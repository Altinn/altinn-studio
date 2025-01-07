using System;
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
    public class CurrentPartyTests : PreviewControllerTestsBase<CurrentPartyTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public CurrentPartyTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_CurrentParty_Ok()
        {
            string dataPathWithData = $"{Org}/{AppV4}/api/authorization/parties/current";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV4}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Party currentParty = JsonConvert.DeserializeObject<Party>(responseDocument.RootElement.ToString());
            Assert.Equal(51001, currentParty.PartyId);
        }
    }
}
