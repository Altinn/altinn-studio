using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;
using Altinn.Platform.Profile;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Profile.UnitTests.Utils;
using Newtonsoft.Json;
using Xunit;

namespace UnitTests
{
    public class UserProfileTests : IClassFixture<CustomWebApplicationFactory<Startup>>
    {
        private readonly CustomWebApplicationFactory<Startup> _factory;

        public UserProfileTests(CustomWebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task Profile_GetCurrent_OK()
        {
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(UserProfile));

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/profile/api/v1/users/current")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string content = await response.Content.ReadAsStringAsync();

            UserProfile user = JsonConvert.DeserializeObject<UserProfile>(await response.Content.ReadAsStringAsync());
            Assert.Equal(1337, user.UserId);
            Assert.Equal("SophieDDG", user.UserName);
            Assert.Equal("Sophie Salt", user.Party.Name);
        }

        [Fact]
        public async Task Profile_GetById_OK()
        {
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(UserProfile));

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/profile/api/v1/users/1337")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string content = await response.Content.ReadAsStringAsync();

            UserProfile user = JsonConvert.DeserializeObject<UserProfile>(await response.Content.ReadAsStringAsync());
            Assert.Equal(1337, user.UserId);
        }

                [Fact]
        public async Task Profile_GetById_NotFound()
        {
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(UserProfile));

            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpStatusCode expected = HttpStatusCode.NotFound;

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/profile/api/v1/users/1994")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            Assert.Equal(expected, response.StatusCode);
        }



        [Fact]
        public async Task Profile_GetBySSN_OK()
        {
            // Arrange 
            string token = PrincipalUtil.GetToken(12345);
            StringContent requestBody = new StringContent(JsonConvert.SerializeObject("01017512345"), Encoding.UTF8, "application/json");

            HttpClient client = SetupUtil.GetTestClient(_factory);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            int expectedUserId = 12345;

            // Act
            HttpResponseMessage response = await client.PostAsync("/profile/api/v1/users/", requestBody);
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

            HttpClient client = SetupUtil.GetTestClient(_factory);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpStatusCode expected = HttpStatusCode.NotFound;

            // Act
            HttpResponseMessage response = await client.PostAsync("/profile/api/v1/users/", requestBody);
            HttpStatusCode actual = response.StatusCode;

            // Assert
            Assert.Equal(expected, actual);
        }

    }
}
