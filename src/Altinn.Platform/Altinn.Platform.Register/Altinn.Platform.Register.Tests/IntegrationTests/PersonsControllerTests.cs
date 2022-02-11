using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
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
using Microsoft.Extensions.Caching.Memory;

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
        public async Task GetPerson_CorrectInput_OutcomeSuccessful()
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

            HttpRequestMessage testRequest = new HttpRequestMessage(HttpMethod.Get, "/register/api/v1/persons/");
            testRequest.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));
            testRequest.Headers.Add("X-Ai-NationalIdentityNumber", "personnumber");
            testRequest.Headers.Add("X-Ai-LastName", "lastname");

            // Act
            HttpResponseMessage response = await client.SendAsync(testRequest);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task GetPerson_MissingParameters_ReturnsBadRequest()
        {
            // Arrange
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = _webApplicationFactorySetup.GetTestServerClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage testRequest = new HttpRequestMessage(HttpMethod.Get, "/register/api/v1/persons/");
            testRequest.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));
            testRequest.Headers.Add("X-Ai-NationalIdentityNumber", "personnumber");

            // Act
            HttpResponseMessage response = await client.SendAsync(testRequest);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            string content = await response.Content.ReadAsStringAsync();

            Assert.Contains("X-Ai-LastName", content);
        }

        [Fact]
        public async Task GetPerson_InvalidInput_ReturnsNotFound()
        {
            // Arrange
            HttpRequestMessage sblRequest = null;
            DelegatingHandlerStub messageHandler = new(async (HttpRequestMessage request, CancellationToken token) =>
            {
                sblRequest = request;

                Party party = new Party { Person = new Person { LastName = "låstnâme" } };
                return await CreateHttpResponseMessage(party);
            });
            _webApplicationFactorySetup.SblBridgeHttpMessageHandler = messageHandler;

            string token = PrincipalUtil.GetToken(1);

            HttpClient client = _webApplicationFactorySetup.GetTestServerClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage testRequest = new HttpRequestMessage(HttpMethod.Get, "/register/api/v1/persons/");
            testRequest.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));
            testRequest.Headers.Add("X-Ai-NationalIdentityNumber", "personnumber");
            testRequest.Headers.Add("X-Ai-LastName", "lastname");

            // Act
            HttpResponseMessage response = await client.SendAsync(testRequest);

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task GetPerson_TooManyAttempts_OutcomeTooManyRequests()
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

            MemoryCacheEntryOptions options = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60)
            };
            _webApplicationFactorySetup.MemoryCache.Set("Person-Lookup-Failed-Attempts1", 44, options);

            string token = PrincipalUtil.GetToken(1);

            HttpClient client = _webApplicationFactorySetup.GetTestServerClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage testRequest = new HttpRequestMessage(HttpMethod.Get, "/register/api/v1/persons/");
            testRequest.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));
            testRequest.Headers.Add("X-Ai-NationalIdentityNumber", "personnumber");
            testRequest.Headers.Add("X-Ai-LastName", "lastname");

            // Act
            HttpResponseMessage response = await client.SendAsync(testRequest);

            // Assert
            Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        }

        [Fact]
        public async Task GetPerson_CallAsOrg_OutcomeForbidden()
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

            string token = PrincipalUtil.GetOrgToken("ttd");

            HttpClient client = _webApplicationFactorySetup.GetTestServerClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage testRequest = new HttpRequestMessage(HttpMethod.Get, "/register/api/v1/persons/");
            testRequest.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));
            testRequest.Headers.Add("X-Ai-NationalIdentityNumber", "personnumber");
            testRequest.Headers.Add("X-Ai-LastName", "lastname");

            // Act
            HttpResponseMessage response = await client.SendAsync(testRequest);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        private static async Task<HttpResponseMessage> CreateHttpResponseMessage(object obj)
        {
            string content = JsonSerializer.Serialize(obj);
            StringContent stringContent = new StringContent(content, Encoding.UTF8, "application/json");
            return await Task.FromResult(new HttpResponseMessage { Content = stringContent });
        }
    }
}
