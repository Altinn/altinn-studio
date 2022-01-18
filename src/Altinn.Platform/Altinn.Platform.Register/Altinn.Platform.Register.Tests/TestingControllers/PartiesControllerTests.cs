using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Register.Services.Interfaces;
using Altinn.Platform.Register.Tests.Mocks;
using Altinn.Platform.Register.Tests.Mocks.Authentication;
using Altinn.Platform.Register.Tests.Utils;

using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Moq;

using Xunit;

namespace Altinn.Platform.Register.Tests.TestingControllers
{
    public class PartiesControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        /// <summary>
        /// Initialises a new instance of the <see cref="PartiesControllerTests"/> class with the given WebApplicationFactory.
        /// </summary>
        /// <param name="factory">The WebApplicationFactory to use when creating a test server.</param>
        public PartiesControllerTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task GetParty_ValidTokenRequestForExistingParty_ReturnsParty()
        {
            string token = PrincipalUtil.GetToken(1);
            int partyId = 6565;

            // Arrange
            Mock<IParties> partiesService = new Mock<IParties>();
            partiesService.Setup(s => s.GetParty(It.Is<int>(o => o == partyId))).ReturnsAsync(new Party());

            HttpClient client = GetTestClient(partiesService.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/register/api/v1/parties/" + partyId);
            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            partiesService.VerifyAll();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            Party actual = await JsonSerializer.DeserializeAsync<Party>(await response.Content.ReadAsStreamAsync());

            Assert.NotNull(actual);
        }

        [Fact]
        public async Task GetParty_ValidTokenRequestForInvalidParty_ReturnsParty()
        {
            string token = PrincipalUtil.GetToken(2);
            int partyId = 6565;

            // Arrange
            Mock<IParties> partiesService = new Mock<IParties>();
            partiesService.Setup(s => s.GetParty(It.Is<int>(o => o == partyId))).ReturnsAsync(new Party());

            HttpClient client = GetTestClient(partiesService.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/register/api/v1/parties/" + partyId);
            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetParty_ValidTokenRequestForNonExistingParty_ReturnsNotFound()
        {
            string token = PrincipalUtil.GetToken(1);
            int partyId = 6565;

            // Arrange
            Mock<IParties> partiesService = new Mock<IParties>();
            partiesService.Setup(s => s.GetParty(It.Is<int>(o => o == partyId))).ReturnsAsync((Party)null);

            HttpClient client = GetTestClient(partiesService.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/register/api/v1/parties/" + partyId);
            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            partiesService.VerifyAll();

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task GetParty_ExpiredToken_ReturnsUnAuthorized()
        {
            string token = PrincipalUtil.GetExpiredToken();
            int partyId = 6565;

            // Arrange
            Mock<IParties> partiesService = new Mock<IParties>();

            HttpClient client = GetTestClient(partiesService.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.GetAsync("/register/api/v1/parties/" + partyId);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task PostPartyLookup_ModelIsInvalid_ReturnsBadRequest()
        {
            string token = PrincipalUtil.GetToken(1);

            // Arrange
            Mock<IParties> partiesService = new Mock<IParties>();

            HttpClient client = GetTestClient(partiesService.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            PartyLookup lookUp = new PartyLookup();

            StringContent requestBody = new StringContent(JsonSerializer.Serialize(lookUp), Encoding.UTF8, "application/json");

            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Post, "/register/api/v1/parties/lookup") { Content = requestBody };
            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task PostPartyLookup_InputIsSsn_BackendServiceRespondsWithNull_ControllerRespondsWithNotFound()
        {
            string token = PrincipalUtil.GetToken(1);

            // Arrange
            string ssn = "27108775284";

            Mock<IParties> partiesService = new Mock<IParties>();
            partiesService.Setup(s => s.LookupPartyBySSNOrOrgNo(It.Is<string>(p => p == ssn))).ReturnsAsync((Party)null);

            HttpClient client = GetTestClient(partiesService.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            PartyLookup lookUp = new PartyLookup { Ssn = ssn };

            StringContent requestBody = new StringContent(JsonSerializer.Serialize(lookUp), Encoding.UTF8, "application/json");

            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Post, "/register/api/v1/parties/lookup") { Content = requestBody };
            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            partiesService.VerifyAll();

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task PostPartyLookup_InputIsOrgNo_BackendServiceRespondsWithParty_ControllerRespondsWithOkAndParty()
        {
            string token = PrincipalUtil.GetToken(1);

            // Arrange
            string orgNo = "555000103";

            Party party = new Party
            {
                OrgNumber = orgNo
            };

            Mock<IParties> partiesService = new Mock<IParties>();
            partiesService.Setup(s => s.LookupPartyBySSNOrOrgNo(It.Is<string>(p => p == orgNo))).ReturnsAsync(party);

            HttpClient client = GetTestClient(partiesService.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            PartyLookup lookUp = new PartyLookup { OrgNo = orgNo };

            StringContent requestBody = new StringContent(JsonSerializer.Serialize(lookUp), Encoding.UTF8, "application/json");

            HttpRequestMessage httpRequestMessage =
                new HttpRequestMessage(HttpMethod.Post, "/register/api/v1/parties/lookup") { Content = requestBody };
            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            partiesService.VerifyAll();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            Party actual = await JsonSerializer.DeserializeAsync<Party>(await response.Content.ReadAsStreamAsync());

            Assert.NotNull(actual);
        }

        [Fact]
        public async Task PostPartyLookup_ExpiredToken_ReturnsUnAuthorized()
        {
            string token = PrincipalUtil.GetExpiredToken();

            // Arrange
            string orgNo = "555000103";

            Mock<IParties> partiesService = new Mock<IParties>();

            HttpClient client = GetTestClient(partiesService.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            PartyLookup lookUp = new PartyLookup { OrgNo = orgNo };

            StringContent requestBody = new StringContent(JsonSerializer.Serialize(lookUp), Encoding.UTF8, "application/json");

            // Act
            HttpResponseMessage response = await client.PostAsync("/register/api/v1/parties/lookup", requestBody);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetParty_MissingAccessToken_ReturnsForbidden()
        {
            string token = PrincipalUtil.GetToken(1);
            int partyId = 6565;

            // Arrange
            Mock<IParties> partiesService = new Mock<IParties>();
            partiesService.Setup(s => s.GetParty(It.Is<int>(o => o == partyId))).ReturnsAsync(new Party());

            HttpClient client = GetTestClient(partiesService.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/register/api/v1/parties/" + partyId);

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        private HttpClient GetTestClient(IParties partiesService)
        {
            string projectDir = Directory.GetCurrentDirectory();
            string configPath = Path.Combine(projectDir, "appsettings.json");

            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton(partiesService);

                    // Set up mock authentication so that not well known endpoint is used
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                    services.AddSingleton<ISigningKeysResolver, SigningKeyResolverMock>();
                    services.AddSingleton<IAuthorization, AuthorizationWrapperMock>();
                });
                builder.ConfigureAppConfiguration((context, conf) => { conf.AddJsonFile(configPath); });
            }).CreateClient();

            return client;
        }
    }
}
