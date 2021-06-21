using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Profile.Models;
using Altinn.Platform.Profile.Tests.IntegrationTests.Utils;
using Altinn.Platform.Profile.Tests.Testdata;

using Microsoft.AspNetCore.Mvc.Testing;

using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Profile.Tests.IntegrationTests
{
    public class UserProfileTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _webApplicationFactory;
        private readonly JsonSerializerOptions serializerOptionsCamelCase = new ()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public UserProfileTests(WebApplicationFactory<Startup> factory)
        {
            _webApplicationFactory = factory;
        }

        [Fact]
        public async Task Profile_GetCurrent_OK()
        {
            // Arrange
            const int UserId = 2516356;

            HttpRequestMessage sblRequest = null;
            DelegatingHandlerStub messageHandlerMock = new (async (HttpRequestMessage request, CancellationToken token) =>
            {
                sblRequest = request;

                UserProfile userProfile = await TestDataLoader.Load<UserProfile>(UserId.ToString());
                return new HttpResponseMessage() { Content = JsonContent.Create(userProfile) };
            });

            HttpRequestMessage httpRequestMessage = CreateGetRequest(UserId, "/profile/api/v1/users/current");

            HttpClient client = _webApplicationFactory.CreateHttpClient(messageHandlerMock);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.NotNull(sblRequest);
            Assert.Equal(HttpMethod.Get, sblRequest.Method);
            Assert.EndsWith($"users/{UserId}", sblRequest.RequestUri.ToString());

            string responseContent = await response.Content.ReadAsStringAsync();

            UserProfile actualUser = System.Text.Json.JsonSerializer.Deserialize<UserProfile>(
                responseContent, serializerOptionsCamelCase);

            // These asserts check that deserializing with camel casing was successful.
            Assert.Equal(UserId, actualUser.UserId);
            Assert.Equal("sophie", actualUser.UserName);
            Assert.Equal("Sophie Salt", actualUser.Party.Name);
            Assert.Equal("Sophie", actualUser.Party.Person.FirstName);
            Assert.Equal("nb", actualUser.ProfileSettingPreference.Language);
        }

        [Fact]
        public async Task Profile_GetById_OK()
        {
            // Arrange
            const int UserId = 2516356;

            HttpRequestMessage sblRequest = null;
            DelegatingHandlerStub messageHandlerMock = new (async (HttpRequestMessage request, CancellationToken token) =>
            {
                sblRequest = request;

                UserProfile userProfile = await TestDataLoader.Load<UserProfile>(UserId.ToString());
                return new HttpResponseMessage() { Content = JsonContent.Create(userProfile) };
            });

            HttpRequestMessage httpRequestMessage = CreateGetRequest(UserId, $"/profile/api/v1/users/{UserId}");

            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            HttpClient client = _webApplicationFactory.CreateHttpClient(messageHandlerMock);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.NotNull(sblRequest);
            Assert.Equal(HttpMethod.Get, sblRequest.Method);
            Assert.EndsWith($"users/{UserId}", sblRequest.RequestUri.ToString());

            string responseContent = await response.Content.ReadAsStringAsync();

            UserProfile actualUser = System.Text.Json.JsonSerializer.Deserialize<UserProfile>(
                responseContent, serializerOptionsCamelCase);

            // These asserts check that deserializing with camel casing was successful.
            Assert.Equal(UserId, actualUser.UserId);
            Assert.Equal("sophie", actualUser.UserName);
            Assert.Equal("Sophie Salt", actualUser.Party.Name);
            Assert.Equal("Sophie", actualUser.Party.Person.FirstName);
            Assert.Equal("nb", actualUser.ProfileSettingPreference.Language);
        }

        [Fact]
        public async Task Profile_GetById_NotFound()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = WebApplicationFactoryExtensions.GetTestClient(_webApplicationFactory);
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

            HttpClient client = WebApplicationFactoryExtensions.GetTestClient(_webApplicationFactory);
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

            HttpClient client = WebApplicationFactoryExtensions.GetTestClient(_webApplicationFactory);
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

        private static HttpRequestMessage CreateGetRequest(int authenticatedUserId, string requestUri)
        {
            HttpRequestMessage httpRequestMessage = new (HttpMethod.Get, requestUri);
            string token = PrincipalUtil.GetToken(authenticatedUserId);
            httpRequestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return httpRequestMessage;
        }
    }
}
