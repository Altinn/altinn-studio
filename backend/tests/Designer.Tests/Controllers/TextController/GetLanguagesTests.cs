using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.TextController
{
    public class GetLanguagesTests : DesignerEndpointsTestsBase<GetLanguagesTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/text";
        public GetLanguagesTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "en", "nb")]
        public async Task GetLanguage_WithValidInput_ReturnsOk(string org, string app, params string[] expectedLangs)
        {
            string url = $"{VersionPrefix(org, app)}/languages";

            string expectedContent = JsonSerializer.Serialize(expectedLangs);

            // Act
            using var response = await HttpClient.GetAsync(url);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string content = await response.Content.ReadAsStringAsync();
            Assert.True(JsonUtils.DeepEquals(expectedContent, content));
        }
    }
}
