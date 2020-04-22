using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Register.IntegrationTest.Utils;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Register.Services.Interfaces;
using Altinn.Platform.Storage.IntegrationTest.Mocks.Authentication;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.Platform.Register.IntegrationTest.TestingControllers
{
    public class PartiesControllerTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;

        /// <summary>
        /// Initialises a new instance of the <see cref="PartiesControllerTests"/> class with the given WebApplicationFactory.
        /// </summary>
        /// <param name="factory">The WebApplicationFactory to use when creating a test server.</param>
        public PartiesControllerTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Test that seeks to ensure that the lookup endpoint has model validation. It does not test model validation.
        /// </summary>
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

            // Act
            HttpResponseMessage response = await client.PostAsync("/register/api/v1/parties/lookup", requestBody);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        /// <summary>
        /// Test that seeks to ensure that the lookup endpoint responds with NotFound if party lookup based on string value returns null.
        /// </summary>
        [Fact]
        public async Task PostPartyLookup_InputIsSsn_BackendServiceRespondsWithNull_ControllerRespondsWithNotFound()
        {
            string token = PrincipalUtil.GetToken(1);

            // Arrange
            string Ssn = "27108775284";

            Mock<IParties> partiesService = new Mock<IParties>();
            partiesService.Setup(s => s.LookupPartyBySSNOrOrgNo(It.Is<string>(p => p == Ssn))).ReturnsAsync((Party)null);

            HttpClient client = GetTestClient(partiesService.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            PartyLookup lookUp = new PartyLookup { Ssn = Ssn }; 

            StringContent requestBody = new StringContent(JsonSerializer.Serialize(lookUp), Encoding.UTF8, "application/json");

            // Act
            HttpResponseMessage response = await client.PostAsync("/register/api/v1/parties/lookup", requestBody);

            string responseCp = await response.Content.ReadAsStringAsync();

            // Assert
            partiesService.VerifyAll();

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        /// <summary>
        /// Test that seeks to ensure that the lookup endpoint responds Ok and a party if the given organisation number is found.
        /// </summary>
        [Fact]
        public async Task PostPartyLookup_InputIsOrgNo_BackendServiceRespondsWithParty_ControllerRespondsWithOkAndParty()
        {
            string token = PrincipalUtil.GetToken(1);

            // Arrange
            string OrgNo = "555000103";

            Party party = new Party
            {
                OrgNumber = OrgNo
            };

            Mock<IParties> partiesService = new Mock<IParties>();
            partiesService.Setup(s => s.LookupPartyBySSNOrOrgNo(It.Is<string>(p => p == OrgNo))).ReturnsAsync(party);

            HttpClient client = GetTestClient(partiesService.Object);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            PartyLookup lookUp = new PartyLookup { OrgNo = OrgNo }; 

            StringContent requestBody = new StringContent(JsonSerializer.Serialize(lookUp), Encoding.UTF8, "application/json");


            // Act
            HttpResponseMessage response = await client.PostAsync("/register/api/v1/parties/lookup", requestBody);

            // Assert
            partiesService.VerifyAll();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            
            Party actual = await JsonSerializer.DeserializeAsync<Party>(await response.Content.ReadAsStreamAsync());

            Assert.NotNull(actual);
        }

        private HttpClient GetTestClient(IParties partiesService)
        {
            Program.ConfigureSetupLogging();

            string projectDir = Directory.GetCurrentDirectory();
            string configPath = Path.Combine(projectDir, "appsettings.json");

            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton(partiesService);

                    // Set up mock authentication so that not well known endpoint is used
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                });
                builder.ConfigureAppConfiguration((context, conf) => { conf.AddJsonFile(configPath); });
            }).CreateClient();

            return client;
        }
    }
}
