using Altinn.App.Api.Controllers;
using Altinn.App.IntegrationTests;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Services;
using App.IntegrationTests.Utils;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace App.IntegrationTests
{
    public class InstanceApiTest: IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public InstanceApiTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Test that verifies Get for a existing instance
        /// </summary>
        /// <returns></returns>
        [Fact]
        public async Task Instance_Get_OK()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/skd/taxreport/instances/1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713")
            {
            };
         
            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            Instance instance = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("1000", instance.InstanceOwner.PartyId);
        }

        [Fact]
        public async Task Instance_Get_NotFound()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/skd/taxreport/instances/1001/26133fb5-a9f2-45d4-90b1-f6d93ad40713")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Instance_Post_Ok()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/skd/taxreport/instances?instanceOwnerPartyId=1000")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        /// <summary>
        /// create a multipart request with instance and xml prefil.
        /// </summary>
        [Fact]
        public async void Instance_Post_WithMultipartPrefill()
        {
            /* SETUP */
            string instanceOwnerPartyId = "1000";

            Instance instanceTemplate = new Instance()
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = instanceOwnerPartyId,
                }                
            };

            string instance = JsonConvert.SerializeObject(instanceTemplate);
            string xml = File.ReadAllText("Data/Files/data-element.xml");

            string boundary = "abcdefgh";
            MultipartFormDataContent formData = new MultipartFormDataContent(boundary)
            {
                { new StringContent(instance, Encoding.UTF8, "application/json"), "instance" },
                { new StringContent(xml, Encoding.UTF8, "application/xml"), "default" }
            };

            Uri uri = new Uri("/tdd/endring-av-navn/instances", UriKind.Relative);
          
            /* TEST */

            HttpClient client = GetTestClient();
            HttpResponseMessage response =  await client.PostAsync(uri, formData);

            response.EnsureSuccessStatusCode();

            Assert.True(response.StatusCode == HttpStatusCode.Created);

            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());

            Assert.NotNull(createdInstance);
            Assert.Single(createdInstance.Data);
            Assert.Equal("default", createdInstance.Data[0].DataType);

        }

            private HttpClient GetTestClient()
        {
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<IInstance, InstanceMockSI>();
                    services.AddSingleton<IRegister, RegisterMockSI>();
                      
                    services.AddSingleton<Altinn.Common.PEP.Interfaces.IPDP, PepAuthorizationMockSI>();
                    services.AddSingleton<IApplication, ApplicationMockSI>();
                });
            })
            .CreateClient();

            return client;
        }
    }
}
