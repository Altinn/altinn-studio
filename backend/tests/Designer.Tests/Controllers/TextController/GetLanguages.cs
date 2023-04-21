using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.TestController
{
    public class GetLanguages : TextControllerTestsBase<GetLanguages>
    {

        public GetLanguages(WebApplicationFactory<TextController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "en", "nb")]
        public async Task GetLanguage_WithValidInput_ReturnsOk(string org, string app, params string[] expectedLangs)
        {
            string url = $"{VersionPrefix(org, app)}/languages";

            string expectedContent = JsonSerializer.Serialize(expectedLangs);

            // Act
            using var response = await HttpClient.Value.GetAsync(url);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string content = await response.Content.ReadAsStringAsync();
            JsonUtils.DeepEquals(expectedContent, content).Should().BeTrue();
        }
    }
}
