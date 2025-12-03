using System.Net;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.TextController
{
    public class GetResourceTests : DesignerEndpointsTestsBase<GetResourceTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/text";
        public GetResourceTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser", "nb")]
        public async Task GetLanguage_WithValidInput_ReturnsOk(string org, string app, string developer, string language)
        {
            string url = $"{VersionPrefix(org, app)}/language/{language}";
            string expectedContent = TestDataHelper.GetFileFromRepo(org, app, developer, $"App/config/texts/resource.{language}.json");

            // Act
            using var response = await HttpClient.GetAsync(url);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string content = await response.Content.ReadAsStringAsync();
            Assert.True(JsonUtils.DeepEquals(expectedContent, content));
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "sr")]
        public async Task GetLanguage_WithNonExistingLang_ReturnsNotFound(string org, string app, string language)
        {
            string url = $"{VersionPrefix(org, app)}/language/{language}";

            // Act
            using var response = await HttpClient.GetAsync(url);

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }
}
