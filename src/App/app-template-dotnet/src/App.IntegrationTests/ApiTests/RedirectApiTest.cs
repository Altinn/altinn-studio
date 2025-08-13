using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.IntegrationTests;

using App.IntegrationTests.Utils;

using Newtonsoft.Json;

using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class RedirectApiTest : IClassFixture<CustomWebApplicationFactory<TestDummy>>
    {
        private readonly CustomWebApplicationFactory<TestDummy> _factory;

        public RedirectApiTest(CustomWebApplicationFactory<TestDummy> factory)
        {
            _factory = factory;
        }

        [Theory]
        [InlineData("https://local.altinn.cloud/ttd/en-annen-app", HttpStatusCode.BadRequest)]
        [InlineData("https://vg.no", HttpStatusCode.BadRequest)]
        [InlineData(null, HttpStatusCode.BadRequest)]
        [InlineData("", HttpStatusCode.BadRequest)]
        [InlineData("https://tt02.hacker.altinn.no", HttpStatusCode.BadRequest)]
        [InlineData("https://tt02.altinnn.no/we/will/hack/you", HttpStatusCode.BadRequest)]
        [InlineData("https://ttd.apps.tt02.altinn.no/ttd/en-annen-app", HttpStatusCode.BadRequest)]
        [InlineData("https://nav.apps.tt02.altinn.no/nav/aap", HttpStatusCode.BadRequest)]
        [InlineData("https://tt02.altinn.no/ui/messagebox", HttpStatusCode.BadRequest)]
        [InlineData("aHR0cHM6Ly90dGQuYXBwcy50dDAyLmFsdGlubi5uby90dGQvZW4tYW5uZW4tYXBw", HttpStatusCode.OK)]
        [InlineData("aHR0cHM6Ly9uYXYuYXBwcy50dDAyLmFsdGlubi5uby9uYXYvYWFw", HttpStatusCode.OK)]
        [InlineData("aHR0cHM6Ly90dDAyLmFsdGlubi5uby91aS9tZXNzYWdlYm94", HttpStatusCode.OK)]
        public async Task ValidateUrl(string url, HttpStatusCode expectedStatusCode)
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "dayplanner");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/ttd/dayplanner/api/v1/redirect?url={url}");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            Assert.Equal(expectedStatusCode, response.StatusCode);
        }

        [Theory]
        [InlineData("")]
        [InlineData("?url=")]
        [InlineData("?url=null")]
        [InlineData("?url=''")]
        public async Task ValidateUrl_QueryParameter_Missing(string queryParameter)
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "dayplanner");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/ttd/dayplanner/api/v1/redirect{queryParameter}");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }
}
