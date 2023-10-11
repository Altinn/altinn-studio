using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.LanguagesController
{
    public class GetLanguagesTests : DisagnerEndpointsTestsBase<GetLanguagesTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly string _versionPrefix = "designer/api";

        public GetLanguagesTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task GetLanguages_ReturnsNnAndNb()
        {
            string dataPathWithData = $"{_versionPrefix}/ttd/new-texts-format/languages";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            List<string> responseList = JsonSerializer.Deserialize<List<string>>(responseDocument.RootElement.ToString());

            Assert.Equal(new List<string> { "nb", "nn" }, responseList);
        }
    }
}
