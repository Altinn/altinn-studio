using Altinn.App.IntegrationTests;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Utils;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using Xunit;

namespace App.IntegrationTestsRef.AppBase
{
    public class AppBaseTest : IClassFixture<CustomWebApplicationFactory<Altinn.App.Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public AppBaseTest(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public void OnInstantiation_ProcessIsStarted()
        {
            throw new NotImplementedException();
        }


        [Fact]
        public void OnTaskEnd_DataElementIsLocked()
        {
            throw new NotImplementedException();
        }

        [Fact]
        public async void OnProcessEnd_InstanceIsArchived()
        {
            string token = PrincipalUtil.GetToken(1);

            HttpClient client = SetupUtil.GetTestClient(_factory, "tdd", "endring-av-navn");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/tdd/endring-av-navn/instances/1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713/process")
            {
            };

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
            string responseContent = response.Content.ReadAsStringAsync().Result;

            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));


            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("formfilling", processState.CurrentTask.ElementId);
        }

    }
}
