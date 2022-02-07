using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

using Altinn.App.IntegrationTests;
using Altinn.Platform.Profile.Models;

using App.IntegrationTests.Utils;

using Newtonsoft.Json;
using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class ProfileApiTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public ProfileApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Test that verifies Get for a existing instance
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task Profile_Get_OK()
        {
            string token = PrincipalUtil.GetToken(1337);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/v1/profile/user/");

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string profileData = await response.Content.ReadAsStringAsync();
            UserProfile profile = JsonConvert.DeserializeObject<UserProfile>(profileData);
            Assert.Equal(1337, profile.UserId);
            Assert.Equal("SophieDDG", profile.UserName);
            Assert.Equal("Sophie Salt", profile.Party.Name);
            Assert.Equal("90001337", profile.PhoneNumber);
            Assert.Equal(1337, profile.PartyId);
            Assert.Equal("01039012345", profile.Party.SSN);
            Assert.Equal("1337@altinnstudiotestusers.com", profile.Email);
            Assert.Equal("Sophie", profile.Party.Person.FirstName);
            Assert.Equal("Salt", profile.Party.Person.LastName);
            Assert.Equal("0151", profile.Party.Person.AddressPostalCode);
            Assert.Equal("Oslo", profile.Party.Person.AddressCity);
            Assert.Equal("Grev Wedels Plass", profile.Party.Person.AddressStreetName);
            Assert.Equal("9", profile.Party.Person.AddressHouseNumber);
        }
    }
}
