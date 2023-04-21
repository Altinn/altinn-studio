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
    public class GetServiceName : TextControllerTestsBase<GetServiceName>
    {

        public GetServiceName(WebApplicationFactory<TextController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "Hvem er hvem?")]
        public async Task GetServiceName_WithValidInput_ReturnsOk(string org, string app, string expectedServiceName)
        {
            string url = $"{VersionPrefix(org, app)}/service-name";

            // Act
            using var response = await HttpClient.Value.GetAsync(url);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string content = await response.Content.ReadAsStringAsync();
            content.Should().BeEquivalentTo(expectedServiceName);
        }
    }
}
