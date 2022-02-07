using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;
using Altinn.Platform.Register.Models;
using App.IntegrationTests.Utils;

using Newtonsoft.Json;
using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class AuthorizationApiTests: IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public AuthorizationApiTests(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task GetCurrentParty_ReturnPartyID_OK()
        {
            // Arrange
            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/authorization/parties/current");

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
            int partyId = JsonConvert.DeserializeObject<int>(responseContent);
            Assert.Equal(1337, partyId);
        }

        [Fact]
        public async Task GetCurrentParty_ReturnParty_OK()
        {
            // Arrange
            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/authorization/parties/current?returnPartyObject=true");

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
            Party party = JsonConvert.DeserializeObject<Party>(responseContent);
            Assert.Equal(1337, party.PartyId);
        }

        [Fact]
        public async Task GetCurrentPartyWithPartyCookieForSelf_ReturnPartyID_OK()
        {
            // Arrange
            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/authorization/parties/current");
            AddPartyCookie(httpRequestMessage, 1337);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
            int partyId = JsonConvert.DeserializeObject<int>(responseContent);
            Assert.Equal(1337, partyId);
        }

        [Fact]
        public async Task GetCurrentPartyWithPartyCookieForSelf_ReturnParty_OK()
        {
            // Arrange
            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/authorization/parties/current?returnPartyObject=true");
            AddPartyCookie(httpRequestMessage, 1337);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
            Party party = JsonConvert.DeserializeObject<Party>(responseContent);
            Assert.Equal(1337, party.PartyId);
        }

        [Fact]
        public async Task GetCurrentPartyWithPartyCookieForOther_ReturnPartyID_OK()
        {
            // Arrange
            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/authorization/parties/current");
            AddPartyCookie(httpRequestMessage, 500003);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
            int partyId = JsonConvert.DeserializeObject<int>(responseContent);
            Assert.Equal(500003, partyId);
        }

        [Fact]
        public async Task GetCurrentPartyWithPartyCookieForOther_ReturnParty_OK()
        {
            // Arrange
            string token = PrincipalUtil.GetToken(1337);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/authorization/parties/current?returnPartyObject=true");
            AddPartyCookie(httpRequestMessage, 500003);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
            Party party = JsonConvert.DeserializeObject<Party>(responseContent);
            Assert.Equal(500003, party.PartyId);
        }

        /// <summary>
        /// Scenrio: User is not authorized for the party in cookie
        /// </summary>
        [Fact]
        public async Task GetCurrentPartyWithPartyCookieForOther_ReturnSelfPartyID_OK()
        {
            // Arrange
            string token = PrincipalUtil.GetToken(1);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/authorization/parties/current");
            AddPartyCookie(httpRequestMessage, 500003);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
            int partyId = JsonConvert.DeserializeObject<int>(responseContent);
            Assert.Equal(1000, partyId);
        }

        /// <summary>
        /// Scenario: User is not authorized for the party in cookie
        /// </summary>
        [Fact]
        public async Task GetCurrentPartyWithPartyCookieForOther_ReturnSelfParty_OK()
        {
            // Arrange
            string token = PrincipalUtil.GetToken(1);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/authorization/parties/current?returnPartyObject=true");
            AddPartyCookie(httpRequestMessage, 500003);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            string responseContent = await response.Content.ReadAsStringAsync();
            IEnumerable<string> cookieHeaders = response.Headers.GetValues("Set-Cookie");
            bool cookieIsSet = false;
            foreach (string cookie in cookieHeaders)
            {
                if (cookie.Contains("AltinnPartyId=1000"))
                {
                    cookieIsSet = true;
                }
            }

            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
            Party party = JsonConvert.DeserializeObject<Party>(responseContent);
            Assert.Equal(1000, party.PartyId);
            Assert.True(cookieIsSet);
        }

        private static void AddPartyCookie(HttpRequestMessage requestMessage, int partyId)
        {
            requestMessage.Headers.Add("Cookie", "AltinnPartyId" + "=" + partyId);
        }
    }
}
