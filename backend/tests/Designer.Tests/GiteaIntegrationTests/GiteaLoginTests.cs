using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Designer.Tests.Fixtures;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.GiteaIntegrationTests
{
    public class GiteaLoginTests : GiteaIntegrationTestsBase<UserController, GiteaLoginTests>
    {
        public GiteaLoginTests(WebApplicationFactory<UserController> factory, GiteaFixture giteaFixture) : base(factory, giteaFixture)
        {
        }

        [Theory]
        [InlineData(GiteaConstants.TestUser, GiteaConstants.TestUserEmail)]
        public async Task GetCurrentUser_ShouldReturnOk(string expectedUserName, string expectedEmail)
        {
            string requestUrl = "designer/api/user/current";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUrl);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            response.Headers.First(h => h.Key == "Set-Cookie").Value.Should().Satisfy(e => e.Contains("XSRF-TOKEN"));
            string content = await response.Content.ReadAsStringAsync();
            var user = JsonSerializer.Deserialize<User>(content, new JsonSerializerOptions()
            {
                PropertyNameCaseInsensitive = true
            });

            user.Login.Should().Be(expectedUserName);
            user.Email.Should().Be(expectedEmail);
        }

    }
}
