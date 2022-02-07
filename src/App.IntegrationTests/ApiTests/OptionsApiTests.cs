using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

using Altinn.App.Common.Models;
using Altinn.App.IntegrationTests;
using App.IntegrationTests.Utils;

using Newtonsoft.Json;
using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class OptionsApiTests : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public OptionsApiTests(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task GetWeekdays()
        {
            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/options/weekdays");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            
            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
            List<AppOption> options = JsonConvert.DeserializeObject<List<AppOption>>(responseContent);
            Assert.Equal(7, options.Count);
        }

        [Fact]
        public async Task GetCarBrands()
        {
            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/options/carbrands");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
            List<AppOption> options = JsonConvert.DeserializeObject<List<AppOption>>(responseContent);
            Assert.Equal(5, options.Count);
        }
    }
}
