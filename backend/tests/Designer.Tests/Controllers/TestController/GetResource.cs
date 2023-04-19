using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.TestController
{
    public class GetResource : TextControllerTestsBase<GetResource>
    {

        public GetResource(WebApplicationFactory<TextController> factory) : base(factory)
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
        [InlineData("ttd", "hvem-er-hvem", "testUser", "sr")]
        public async Task GetLanguage_WithNonExistingLang_ReturnsNotFound(string org, string app, string developer, string language)
        {
            string url = $"{VersionPrefix(org, app)}/language/{language}";

            // Act
            using var response = await HttpClient.Value.GetAsync(url);

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }
}
