using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Models;
using Altinn.App.IntegrationTests;
using App.IntegrationTests.Utils;
using FluentAssertions;
using Newtonsoft.Json;
using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class OptionsApiTests : IClassFixture<CustomWebApplicationFactory<TestDummy>>
    {
        private readonly CustomWebApplicationFactory<TestDummy> _factory;

        public OptionsApiTests(CustomWebApplicationFactory<TestDummy> factory)
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
            
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
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

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            List<AppOption> options = JsonConvert.DeserializeObject<List<AppOption>>(responseContent);
            Assert.Equal(5, options.Count);
        }

        [Fact]
        public async Task InstanceAwareOptions_Returns404WhenNoOptionProviderIsFound()
        {
            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1337/85072561-d318-48ab-a348-4654e520bca3/options/vehicles");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task InstanceAwareOptions_Returns403WhenNotAuthorized()
        {
            string token = PrincipalUtil.GetToken(666);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1337/85072561-d318-48ab-a348-4654e520bca3/options/vehicles");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task InstanceAwareOptions_ReturnsOptionsWhenAuthorized()
        {
            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1337/85072561-d318-48ab-a348-4654e520bca3/options/answers");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            List<AppOption> options = JsonConvert.DeserializeObject<List<AppOption>>(responseContent);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            options.Should().Contain(o => o.Value == "42");
        }
    }
}
