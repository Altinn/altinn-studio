using Altinn.App.IntegrationTests;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;
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

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713")
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

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1001/26133fb5-a9f2-45d4-90b1-f6d93ad40713")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Instance_Post_WithQueryParamOk()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances?instanceOwnerPartyId=1000")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            string responseContent = response.Content.ReadAsStringAsync().Result;
            Instance instance = JsonConvert.DeserializeObject<Instance>(responseContent);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.NotNull(instance);
            Assert.Equal("1000", instance.InstanceOwner.PartyId);

            TestDataUtil.DeletInstanceAndData("tdd", "endring-av-navn", 1000, new Guid(instance.Id.Split('/')[1]));
        }

        [Fact]
        public async void Instance_Post_With_InstanceTemplate()
        {
            string token = PrincipalUtil.GetToken(1);

            Instance instanceTemplate = new Instance
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = "1000",
                },
                DueBefore = DateTime.Parse("2020-01-01"),
            };

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);


            StringContent content = new StringContent(instanceTemplate.ToString(), Encoding.UTF8);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, "/tdd/endring-av-navn/instances")
            {                
                Content = content,
            };            

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(responseContent);

            Assert.Equal("1000", createdInstance.InstanceOwner.PartyId);
            TestDataUtil.DeletInstanceAndData("tdd", "endring-av-navn",1000, new Guid(createdInstance.Id.Split('/')[1]));

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

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            string token = PrincipalUtil.GetToken(1);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpResponseMessage response =  await client.PostAsync(uri, formData);

            response.EnsureSuccessStatusCode();

            Assert.True(response.StatusCode == HttpStatusCode.Created);

            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());

            Assert.NotNull(createdInstance);
            Assert.Single(createdInstance.Data);
            Assert.Equal("default", createdInstance.Data[0].DataType);

            TestDataUtil.DeletInstanceAndData("tdd", "endring-av-navn", 1000, new Guid(createdInstance.Id.Split('/')[1]));
        }
    }
}
