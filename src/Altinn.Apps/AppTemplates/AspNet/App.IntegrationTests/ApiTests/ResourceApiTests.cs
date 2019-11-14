using Altinn.App.Common.Interface;
using Altinn.App.IntegrationTests;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn;
using App.IntegrationTests.Mocks.Services;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace App.IntegrationTestsRef.ApiTests
{
    public class ResourceApiTests : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public ResourceApiTests(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task GetFormLayout_Ok()
        {
            string token = PrincipalUtil.GetToken(1);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/resource/FormLayout.json")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task GetServiceMetadata_Ok()
        {
            string token = PrincipalUtil.GetToken(1);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/metadata/ServiceMetaData")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task GetLanguage_Ok()
        {
            string token = PrincipalUtil.GetToken(1);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/textresources/GetLanguageAsJson")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task GetRuleHandler_Ok()
        {
            string token = PrincipalUtil.GetToken(1);
            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/api/resource/RuleHandler.js")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        }
    }
}
