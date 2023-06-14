using System.Net;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.TextController
{
    public class GetResource : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.TextController, GetResource>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/text";
        public GetResource(WebApplicationFactory<Altinn.Studio.Designer.Controllers.TextController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser", "nb")]
        public async Task GetLanguage_WithValidInput_ReturnsOk(string org, string app, string developer, string language)
        {
            string url = $"{VersionPrefix(org, app)}/language/{language}";
            string expectedContent = TestDataHelper.GetFileFromRepo(org, app, developer, $"App/config/texts/resource.{language}.json");

            // Act
            using var response = await HttpClient.Value.GetAsync(url);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string content = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedContent, content).Should().BeTrue();
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "sr")]
        public async Task GetLanguage_WithNonExistingLang_ReturnsNotFound(string org, string app, string language)
        {
            string url = $"{VersionPrefix(org, app)}/language/{language}";

            // Act
            using var response = await HttpClient.Value.GetAsync(url);

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }
}
