using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;

using App.IntegrationTests.Utils;

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
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/");

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
        public async Task GetHome_OK_WithAuthCookie()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/");

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

        [Fact]
        public async Task GetHome_Redirect_WithQueryParameters()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn?DontChooseReportee=true&");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string redirectUrl = response.RequestMessage.RequestUri.ToString();

            // Verify that 
            Assert.Contains("DontChooseReportee=true", redirectUrl);
        }

        [Fact]
        public async Task GetHome_Redirect_InvalidQueryParametersIgnored()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn?randomParameter=test&DontChooseReportee=true&");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string redirectUrl = response.RequestMessage.RequestUri.ToString();

            // Verify that
            Assert.DoesNotContain("randomParameter", redirectUrl);
        }
    }
}
