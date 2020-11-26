using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;

using Altinn.App;
using Altinn.App.IntegrationTests;
using Altinn.App.IntegrationTests.Mocks.Authentication;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Authentication.Maskinporten;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.JwtCookie;

using App.IntegrationTests.Mocks.Services;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Mocks.Services;
using App.IntegrationTestsRef.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace App.IntegrationTestsRef.EndToEndTests
{
    public class NabovarselEndToEnd : IClassFixture<CustomWebApplicationFactory<Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        private string org;
        private string app;

        private int instanceOwnerId;

        private string instanceGuid;

        private Instance instance;
        private readonly Dictionary<string, DataElement> dataElements = new Dictionary<string, DataElement>();
        private readonly Dictionary<string, object> dataBlobs = new Dictionary<string, object>();

        public NabovarselEndToEnd(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async void NaboVarselEndToEndTest()
        {
            /* SETUP */
            string instanceOwnerPartyId = "1337";

            Instance instanceTemplate = new Instance()
            {
                InstanceOwner = new InstanceOwner
                {
                    PartyId = instanceOwnerPartyId,
                }
            };

            #region Org instansiates form with message
            string instanceAsString = JsonConvert.SerializeObject(instanceTemplate);
            string xml = File.ReadAllText("Data/Files/data-element.xml");
            string xmlmelding = File.ReadAllText("Data/Files/melding.xml");

            string boundary = "abcdefgh";
            MultipartFormDataContent formData = new MultipartFormDataContent(boundary)
            {
                { new StringContent(instanceAsString, Encoding.UTF8, "application/json"), "instance" },
                { new StringContent(xml, Encoding.UTF8, "application/xml"), "skjema" },
                { new StringContent(xmlmelding, Encoding.UTF8, "application/xml"), "melding" }
            };

            Uri uri = new Uri("/dibk/nabovarsel/instances", UriKind.Relative);

            /* TEST */

            HttpClient client = SetupUtil.GetTestClient(_factory, "dibk", "nabovarsel");
            string token = PrincipalUtil.GetOrgToken("dibk");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpResponseMessage response = await client.PostAsync(uri, formData);

            response.EnsureSuccessStatusCode();

            Assert.True(response.StatusCode == HttpStatusCode.Created);

            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());

            Assert.NotNull(createdInstance);
            Assert.Equal(2, createdInstance.Data.Count);
            #endregion

            #region end user gets instance

            // Reset token and client to end user
            client = SetupUtil.GetTestClient(_factory, "dibk", "nabovarsel");
            token = PrincipalUtil.GetToken(1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpRequestMessage httpRequestMessage =
            new HttpRequestMessage(HttpMethod.Get, "/dibk/nabovarsel/instances/" + createdInstance.Id);

            response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            Instance instance = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("1337", instance.InstanceOwner.PartyId);
            Assert.Equal("Task_1", instance.Process.CurrentTask.ElementId);
            Assert.Equal(2, instance.Data.Count);
            #endregion

            TestDataUtil.DeleteInstanceAndData("dibk", "nabovarsel", 1337, new Guid(createdInstance.Id.Split('/')[1]));
        }
    }
}
