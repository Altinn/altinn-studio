using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

using Altinn.Platform.Profile.Models;
using Altinn.Platform.Profile.Tests.IntegrationTests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;

using Newtonsoft.Json;

using Xunit;

namespace Altinn.Platform.Profile.Tests.IntegrationTests
{
    public class UserProfileTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;

        public UserProfileTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task Profile_GetCurrent_OK()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = WebApplicationFactoryExtensions.GetTestClient(_factory);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Get, "/profile/api/v1/users/current");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            UserProfile user = JsonConvert.DeserializeObject<UserProfile>(await response.Content.ReadAsStringAsync());
            Assert.Equal(1337, user.UserId);
            Assert.Equal("SophieDDG", user.UserName);
            Assert.Equal("Sophie Salt", user.Party.Name);
        }

        [Fact]
        public async Task Profile_GetById_OK()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = WebApplicationFactoryExtensions.GetTestClient(_factory);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Get, "/profile/api/v1/users/1337");

            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            UserProfile user = JsonConvert.DeserializeObject<UserProfile>(await response.Content.ReadAsStringAsync());
            Assert.Equal(1337, user.UserId);
        }

        [Fact]
        public async Task Profile_GetById_NotFound()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = WebApplicationFactoryExtensions.GetTestClient(_factory);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpStatusCode expected = HttpStatusCode.NotFound;

            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Get, "/profile/api/v1/users/1994");

            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            Assert.Equal(expected, response.StatusCode);
        }

        [Fact]
        public async Task Profile_GetBySSN_OK()
        {
            // Arrange 
            string token = PrincipalUtil.GetToken(12345);
            StringContent requestBody = new StringContent(JsonConvert.SerializeObject("01017512345"), Encoding.UTF8, "application/json");

            HttpClient client = WebApplicationFactoryExtensions.GetTestClient(_factory);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            int expectedUserId = 12345;

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/profile/api/v1/users/")
            {
                Content = requestBody
            };

            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            UserProfile actual = JsonConvert.DeserializeObject<UserProfile>(await response.Content.ReadAsStringAsync());

            // Assert
            Assert.Equal(expectedUserId, actual.UserId);
        }

        [Fact]
        public async Task Profile_GetBySSN_NotFound()
        {
            // Arrange 
            string token = PrincipalUtil.GetToken(12345);
            StringContent requestBody = new StringContent(JsonConvert.SerializeObject("123456789"), Encoding.UTF8, "application/json");

            HttpClient client = WebApplicationFactoryExtensions.GetTestClient(_factory);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpStatusCode expected = HttpStatusCode.NotFound;

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/profile/api/v1/users/")
            {
                Content = requestBody
            };

            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            HttpStatusCode actual = response.StatusCode;

            // Assert
            Assert.Equal(expected, actual);
        }
    }
}
