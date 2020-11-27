using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;
using System.Xml.Serialization;
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
using App.IntegrationTests.Mocks.Apps.dibk.nabovarsel;
using App.IntegrationTests.Mocks.Services;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Data.apps.dibk.nabovarsel;
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

            SvarPaaNabovarselType svar = new SvarPaaNabovarselType();
            svar.ansvarligSoeker = new PartType();
            svar.ansvarligSoeker.mobilnummer = "90912345";
            string xml = string.Empty;
            using (var stringwriter = new System.IO.StringWriter())
            {
                XmlSerializer serializer = new XmlSerializer(typeof(SvarPaaNabovarselType));
                serializer.Serialize(stringwriter, svar);
                xml = stringwriter.ToString();
            }

            #region Org instansiates form with message
            string instanceAsString = JsonConvert.SerializeObject(instanceTemplate);
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

            string instancePath = "/dibk/nabovarsel/instances/" + createdInstance.Id;

            HttpRequestMessage httpRequestMessage =
            new HttpRequestMessage(HttpMethod.Get, instancePath);

            response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            Instance instance = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("1337", instance.InstanceOwner.PartyId);
            Assert.Equal("Task_1", instance.Process.CurrentTask.ElementId);
            Assert.Equal(2, instance.Data.Count);
            #endregion

            #region end user gets application metadata

            // Reset token and client to end user
            client = SetupUtil.GetTestClient(_factory, "dibk", "nabovarsel");
            token = PrincipalUtil.GetToken(1337);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            httpRequestMessage =
            new HttpRequestMessage(HttpMethod.Get, "/dibk/nabovarsel/api/v1/applicationmetadata");

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Application application = (Application)JsonConvert.DeserializeObject(responseContent, typeof(Application));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Message DataElement

            DataType dataType = application.DataTypes.FirstOrDefault(r => r.TaskId != null && r.TaskId.Equals(instance.Process.CurrentTask.ElementId));

            DataElement dataElementMessage = instance.Data.FirstOrDefault(r => r.DataType.Equals(dataType.Id));

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, instancePath + "/data/" + dataElementMessage.Id)
            {
            };

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Melding melding = (Melding)JsonConvert.DeserializeObject(responseContent, typeof(Melding));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Informasjon om tiltak", melding.MessageTitle);
            #endregion

            #region Get Status
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process")
            {
            };

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));

            #endregion

            // TODO. Add verification of not able to update message and check that statues is updated
            #region push to next step

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/next");

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Status after next
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process")
            {
            };

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));

            #endregion

            #region Get Form DataElement

            dataType = application.DataTypes.FirstOrDefault(r => r.TaskId != null && r.TaskId.Equals(instance.Process.CurrentTask.ElementId));

            DataElement dataElementForm = instance.Data.FirstOrDefault(r => r.DataType.Equals(dataType.Id));

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, instancePath + "/data/" + dataElementForm.Id)
            {
            };

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            SvarPaaNabovarselType skjema = (SvarPaaNabovarselType)JsonConvert.DeserializeObject(responseContent, typeof(SvarPaaNabovarselType));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            #endregion

            TestDataUtil.DeleteInstanceAndData("dibk", "nabovarsel", 1337, new Guid(createdInstance.Id.Split('/')[1]));
        }
    }
}
