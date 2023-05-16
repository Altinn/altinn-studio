using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.SessionController
{
    public class GetSessionDetailsTests : SessionControllerTestsBase<GetSessionDetailsTests>
    {
        public GetSessionDetailsTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.SessionController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("AppToken", "AppTokenId", "Username", "DesignerSessionTimeout")]
        public async Task GetSessionDetails_ShouldReturn_Ok(params string[] expectedKeys)
        {
            // Arrange
            string uri = $"{VersionPrefix}/details";

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string responseString = await response.Content.ReadAsStringAsync();
            Dictionary<string, string> content = JsonSerializer.Deserialize<Dictionary<string, string>>(responseString);

            foreach (string expectedKey in expectedKeys)
            {
                content.ContainsKey(expectedKey).Should().BeTrue();
            }

        }

    }
}
