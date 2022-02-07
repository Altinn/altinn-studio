using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Register.Configuration;
using Altinn.Platform.Register.Controllers;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Register.Tests.IntegrationTests.Utils;
using Altinn.Platform.Register.Tests.Mocks;
using Altinn.Platform.Register.Tests.Utils;

using Microsoft.AspNetCore.Mvc.Testing;

using Moq;

using Xunit;

namespace Altinn.Platform.Register.Tests.IntegrationTests
{
    public class PersonsControllerTests : IClassFixture<WebApplicationFactory<PersonsController>>
    {
        private readonly WebApplicationFactorySetup<PersonsController> _webApplicationFactorySetup;

        public PersonsControllerTests(WebApplicationFactory<PersonsController> factory)
        {
            _webApplicationFactorySetup = new WebApplicationFactorySetup<PersonsController>(factory);

            GeneralSettings generalSettings = new() { BridgeApiEndpoint = "http://localhost/" };
            _webApplicationFactorySetup.GeneralSettingsOptions.Setup(s => s.Value).Returns(generalSettings);
        }

        [Fact]
        public async Task GetPersonPartyAsync_CorrectInput_OutcomeSuccessful()
        {
            // Arrange
            HttpRequestMessage sblRequest = null;
            DelegatingHandlerStub messageHandler = new(async (HttpRequestMessage request, CancellationToken token) =>
            {
                sblRequest = request;

                Party party = new Party { Person = new Person { LastName = "làstnâme" } };
                return await CreateHttpResponseMessage(party);
            });
            _webApplicationFactorySetup.SblBridgeHttpMessageHandler = messageHandler;

            string token = PrincipalUtil.GetToken(1);

            HttpClient client = _webApplicationFactorySetup.GetTestServerClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/register/api/v1/persons/");
            httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));
            httpRequestMessage.Headers.Add("X-Ai-NationalIdentityNumber", "personnumber");
            httpRequestMessage.Headers.Add("X-Ai-LastName", "lastname");

            // Act
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            Party actual = await response.Content.ReadFromJsonAsync<Party>();

            Assert.NotNull(actual);
        }

        private static async Task<HttpResponseMessage> CreateHttpResponseMessage(object obj)
        {
            string content = JsonSerializer.Serialize(obj);
            StringContent stringContent = new StringContent(content, Encoding.UTF8, "application/json");
            return await Task.FromResult(new HttpResponseMessage { Content = stringContent });
        }
    }
}
