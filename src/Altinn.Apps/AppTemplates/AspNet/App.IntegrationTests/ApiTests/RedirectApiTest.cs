using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;
using Altinn.Platform.Storage.Interface.Models;

using App.IntegrationTests.Utils;

using Newtonsoft.Json;

using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class RedirectApiTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public RedirectApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Theory]
        [InlineData("https://altinn3local.no/ttd/en-annen-app", HttpStatusCode.BadRequest)]
        [InlineData("https://vg.no", HttpStatusCode.BadRequest)]
        [InlineData("https://tt02.hacker.altinn.no", HttpStatusCode.BadRequest)]
        [InlineData("https://tt02.altinnn.no/we/will/hack/you", HttpStatusCode.BadRequest)]
        [InlineData("https://ttd.apps.tt02.altinn.no/ttd/en-annen-app", HttpStatusCode.OK)]
        [InlineData("https://nav.apps.tt02.altinn.no/nav/aap", HttpStatusCode.OK)]
        [InlineData("https://tt02.altinn.no/ui/messagebox", HttpStatusCode.OK)]
        public async Task ValidateUrl(string url, HttpStatusCode expectedStatusCode)
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "ttd", "dayplanner");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"/ttd/dayplanner/api/v1/redirect?url={url}");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            Assert.Equal(expectedStatusCode, response.StatusCode);
        }

    }
}
