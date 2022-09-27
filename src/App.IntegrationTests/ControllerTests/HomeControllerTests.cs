using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.IntegrationTests;
using App.IntegrationTests.Utils;

using Xunit;

namespace App.IntegrationTestsRef.ControllerTests
{
    public class HomeControllerTests : IClassFixture<CustomWebApplicationFactory<TestDummy>>
    {
        private readonly CustomWebApplicationFactory<TestDummy> _factory;

        public HomeControllerTests(CustomWebApplicationFactory<TestDummy> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task GetHome_OK()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            _ = await response.Content.ReadAsStringAsync();
            IEnumerable<string> cookieHeaders = response.Headers.GetValues("Set-Cookie");

            // Verify that 
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(2, cookieHeaders.Count());
            Assert.StartsWith("AS-", cookieHeaders.ElementAt(0));
            Assert.StartsWith("XSR", cookieHeaders.ElementAt(1));
        }

        [Fact]
        public async Task GetHome_StatelessAnonymous_OK()
        {
            string org = "ttd";
            string app = "anonymous-stateless";
            HttpClient client = SetupUtil.GetTestClient(_factory, org, app);
            var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/{org}/{app}/");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task GetHome_OK_WithAuthCookie()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/");

            SetupUtil.AddAuthCookie(httpRequestMessage, token);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            _ = await response.Content.ReadAsStringAsync();
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
            var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn?DontChooseReportee=true&");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string redirectUrl = response.RequestMessage.RequestUri.ToString();

            // Verify that 
            Assert.Contains("DontChooseReportee=true", redirectUrl);
        }

        [Fact]
        public async Task GetHome_Redirect_WithIssQueryParameters()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "model-validation");
            var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn?DontChooseReportee=true&");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string redirectUrl = response.RequestMessage.RequestUri.ToString();

            // Verify that 
            Assert.Contains("iss=idporten", redirectUrl);
        }

        [Fact]
        public async Task GetHome_Redirect_InvalidQueryParametersIgnored()
        {
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn?randomParameter=test&DontChooseReportee=true&");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string redirectUrl = response.RequestMessage.RequestUri.ToString();

            // Verify that
            Assert.DoesNotContain("randomParameter", redirectUrl);
        }
    }
}
