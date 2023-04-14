using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.TextsController
{
    public class GetTests : TextsControllerTestsBase<GetTests>
    {

        public GetTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.TextsController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "new-texts-format", "nb")]
        public async Task Get_ReturnsNbTexts(string org, string app, string lang)
        {
            string dataPathWithData = $"{VersionPrefix(org, app)}/language/{lang}";
            HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Dictionary<string, string> responseDictionary = JsonSerializer.Deserialize<Dictionary<string, string>>(responseDocument.RootElement.ToString());

            Dictionary<string, string> expectedDictionary = new Dictionary<string, string>
                { { "nb_key1", "nb_value1" }, { "nb_key2", "nb_value2" } };
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(expectedDictionary, responseDictionary);
        }

        [Theory]
        [InlineData("ttd", "new-texts-format", "nb")]
        public async Task Get_Markdown_200Ok(string org, string app, string lang)
        {
            string dataPathWithData = $"{VersionPrefix(org, app)}/language/{lang}";
            HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }

        [Theory]
        [InlineData("ttd", "new-texts-format", "uk")]
        public async Task Get_NonExistingFile_404NotFound(string org, string app, string lang)
        {
            string dataPathWithData = $"{VersionPrefix(org, app)}/language/{lang}";
            HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);

            Assert.Equal(StatusCodes.Status404NotFound, (int)response.StatusCode);
            Assert.Equal("The texts file, uk.texts.json, that you are trying to find does not exist.", responseDocument.RootElement.ToString());
        }

        [Theory]
        [InlineData("ttd", "invalid-texts-format", "en")]
        public async Task Get_InvalidFile_500InternalServer(string org, string app, string lang)
        {
            string dataPathWithData = $"{VersionPrefix(org, app)}/language/{lang}";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);
            Dictionary<string, string> responseDictionary = JsonSerializer.Deserialize<Dictionary<string, string>>(responseDocument.RootElement.ToString());

            Assert.Equal(StatusCodes.Status500InternalServerError, (int)response.StatusCode);
            Assert.Equal("The format of the file, en.texts.json, that you tried to access might be invalid.", responseDictionary["errorMessage"]);
        }
    }
}
