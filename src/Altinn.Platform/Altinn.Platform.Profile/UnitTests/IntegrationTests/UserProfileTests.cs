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
        public async Task GetUsersCurrent_SblBridgeFindsProfile_ResponseOk_ReturnsUserProfile()
        {
            // Arrange
            const int UserId = 2516356;

            HttpRequestMessage sblRequest = null;
            DelegatingHandlerStub messageHandler = new (async (HttpRequestMessage request, CancellationToken token) =>
            {
                sblRequest = request;

                UserProfile userProfile = await TestDataLoader.Load<UserProfile>(UserId.ToString());
                return new HttpResponseMessage() { Content = JsonContent.Create(userProfile) };
            });

            HttpRequestMessage httpRequestMessage = CreateGetRequest(UserId, "/profile/api/v1/users/current");

            HttpClient client = _webApplicationFactory.CreateHttpClient(messageHandler);

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
        public async Task GetUsersById_SblBridgeFindsProfile_ResponseOk_ReturnsUserProfile()
        {
            // Arrange
            const int UserId = 2516356;

            HttpRequestMessage sblRequest = null;
            DelegatingHandlerStub messageHandler = new (async (HttpRequestMessage request, CancellationToken token) =>
            {
                sblRequest = request;

                UserProfile userProfile = await TestDataLoader.Load<UserProfile>(UserId.ToString());
                return new HttpResponseMessage() { Content = JsonContent.Create(userProfile) };
            });

            HttpRequestMessage httpRequestMessage = CreateGetRequest(UserId, $"/profile/api/v1/users/{UserId}");

            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            HttpClient client = _webApplicationFactory.CreateHttpClient(messageHandler);

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
        public async Task GetUsersById_SblBridgeReturnsNotFound_ResponseNotFound()
        {
            // Arrange
            const int UserId = 2222222;

            HttpRequestMessage sblRequest = null;
            DelegatingHandlerStub messageHandler = new (async (HttpRequestMessage request, CancellationToken token) =>
            {
                sblRequest = request;

                return new HttpResponseMessage() { StatusCode = HttpStatusCode.NotFound };
            });

            HttpRequestMessage httpRequestMessage = CreateGetRequest(UserId, $"/profile/api/v1/users/{UserId}");

            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            HttpClient client = _webApplicationFactory.CreateHttpClient(messageHandler);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

            Assert.NotNull(sblRequest);
            Assert.Equal(HttpMethod.Get, sblRequest.Method);
            Assert.EndsWith($"users/{UserId}", sblRequest.RequestUri.ToString());
        }

        [Fact]
        public async Task GetUsersBySsn_SblBridgeFindsProfile_ReturnsUserProfile()
        {
            // Arrange
            HttpRequestMessage sblRequest = null;
            DelegatingHandlerStub messageHandler = new (async (HttpRequestMessage request, CancellationToken token) =>
            {
                sblRequest = request;

                UserProfile userProfile = await TestDataLoader.Load<UserProfile>("2516356");
                return new HttpResponseMessage() { Content = JsonContent.Create(userProfile) };
            });

            StringContent content = new StringContent("\"01017512345\"", Encoding.UTF8, "application/json");
            HttpRequestMessage httpRequestMessage = CreatePostRequest(2222222, $"/profile/api/v1/users/", content);

            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            HttpClient client = _webApplicationFactory.CreateHttpClient(messageHandler);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.NotNull(sblRequest);
            Assert.Equal(HttpMethod.Post, sblRequest.Method);
            Assert.EndsWith($"users", sblRequest.RequestUri.ToString());

            string requestContent = await sblRequest.Content.ReadAsStringAsync();

            Assert.Equal("\"01017512345\"", requestContent);

            string responseContent = await response.Content.ReadAsStringAsync();

            UserProfile actualUser = System.Text.Json.JsonSerializer.Deserialize<UserProfile>(
                responseContent, serializerOptionsCamelCase);

            // These asserts check that deserializing with camel casing was successful.
            Assert.Equal(2516356, actualUser.UserId);
            Assert.Equal("sophie", actualUser.UserName);
            Assert.Equal("Sophie Salt", actualUser.Party.Name);
            Assert.Equal("Sophie", actualUser.Party.Person.FirstName);
            Assert.Equal("nb", actualUser.ProfileSettingPreference.Language);
        }

        [Fact]
        public async Task GetUsersBySsn_SblBridgeReturnsNotFound_RespondsNotFound()
        {
            // Arrange
            HttpRequestMessage sblRequest = null;
            DelegatingHandlerStub messageHandler = new (async (HttpRequestMessage request, CancellationToken token) =>
            {
                sblRequest = request;

                return new HttpResponseMessage() { StatusCode = HttpStatusCode.NotFound };
            });

            StringContent content = new StringContent("\"01017512345\"", Encoding.UTF8, "application/json");
            HttpRequestMessage httpRequestMessage = CreatePostRequest(2222222, $"/profile/api/v1/users/", content);

            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            HttpClient client = _webApplicationFactory.CreateHttpClient(messageHandler);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

            Assert.NotNull(sblRequest);
            Assert.Equal(HttpMethod.Post, sblRequest.Method);
            Assert.EndsWith($"users", sblRequest.RequestUri.ToString());

            string requestContent = await sblRequest.Content.ReadAsStringAsync();

            Assert.Equal("\"01017512345\"", requestContent);
        }

        private static HttpRequestMessage CreateGetRequest(int userId, string requestUri)
        {
            HttpRequestMessage httpRequestMessage = new (HttpMethod.Get, requestUri);
            string token = PrincipalUtil.GetToken(userId);
            httpRequestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return httpRequestMessage;
        }

        private static HttpRequestMessage CreatePostRequest(int userId, string requestUri, StringContent content)
        {
            HttpRequestMessage httpRequestMessage = new (HttpMethod.Post, requestUri);
            string token = PrincipalUtil.GetToken(userId);
            httpRequestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            httpRequestMessage.Content = content;
            return httpRequestMessage;
        }
    }
}
