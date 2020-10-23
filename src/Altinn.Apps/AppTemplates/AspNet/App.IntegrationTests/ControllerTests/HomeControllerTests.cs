using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;

using Xunit;

namespace App.IntegrationTests.ControllerTests
{
    public class HomeControllerTests : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public HomeControllerTests(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task GetHome_OK()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            IEnumerable<string> cookieHeaders = response.Headers.GetValues("Set-Cookie");

            // Verify that 
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(2, cookieHeaders.Count());
            Assert.StartsWith("AS-", cookieHeaders.ElementAt(0));
            Assert.StartsWith("XSR", cookieHeaders.ElementAt(1));
        }

        [Fact]
        public async Task GetHomeWithInstanceId_OK()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/36133fb5-a9f2-45d4-90b1-f6d93ad40713")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task GetHome_OK_WithAuthCookie()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/")
            {
            };

            SetupUtil.AddAuthCookie(httpRequestMessage, token);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            IEnumerable<string> cookieHeaders = response.Headers.GetValues("Set-Cookie");

            // Verify that 
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(2, cookieHeaders.Count());
            Assert.StartsWith("AS-", cookieHeaders.ElementAt(0));
            Assert.StartsWith("XSR", cookieHeaders.ElementAt(1));
        }
    }
}
