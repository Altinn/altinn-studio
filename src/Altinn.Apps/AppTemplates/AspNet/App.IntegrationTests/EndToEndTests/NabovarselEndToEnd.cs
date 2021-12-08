using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Xml.Serialization;
using Altinn.App;

using Altinn.App.IntegrationTests;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Data.apps.dibk.nabovarsel;

using Newtonsoft.Json;
using Xunit;

namespace App.IntegrationTestsRef.EndToEndTests
{
    public class NabovarselEndToEnd : IClassFixture<CustomWebApplicationFactory<Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public NabovarselEndToEnd(CustomWebApplicationFactory<Altinn.App.Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// This test do the following
        /// 1. Instansiates a app instance with a form and a message as an app
        /// 2. End user calls instance API and get overview over the data in a instance
        /// 3. End user calls application metadata to get an overview over where data should be shown.
        /// 4. Gets the data for Task_1
        /// 5. Validate instance
        /// 6. Push instance to Task_2
        /// 7. Gets data for Task 2
        /// 8. Tries to push to next task, but got error cause of validation error
        /// 9. Validation data
        /// 10. Updates data to correct it
        /// 11. Push to next
        /// 12. Verify Process state
        /// 13. Push to next and end task
        /// 14. Verify Process state
        /// </summary>
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
            svar.eiendomByggested = new EiendomListe();
            svar.eiendomByggested.eiendom = new List<EiendomType>();
            svar.eiendomByggested.eiendom.Add(new EiendomType() { adresse = new EiendommensAdresseType() { postnr = "8450" }, kommunenavn = "Hadsel" });
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
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/dibk/nabovarsel/api/v1/applicationmetadata");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Application application = (Application)JsonConvert.DeserializeObject(responseContent, typeof(Application));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Message DataElement

            // In this application the message element is connected to Task_1. Find the datatype for this task and retrive this from storage
            DataType dataType = application.DataTypes.FirstOrDefault(r => r.TaskId != null && r.TaskId.Equals(instance.Process.CurrentTask.ElementId));
            DataElement dataElementMessage = instance.Data.FirstOrDefault(r => r.DataType.Equals(dataType.Id));
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, instancePath + "/data/" + dataElementMessage.Id);
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Melding melding = (Melding)JsonConvert.DeserializeObject(responseContent, typeof(Melding));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Informasjon om tiltak", melding.MessageTitle);
            #endregion

            #region Get Status
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
            #endregion

            #region Validate instance (the message element)
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/validate");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            List<ValidationIssue> messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));
            Assert.Empty(messages);
            #endregion

            // TODO. Add verification of not able to update message and check that statues is updated
            #region push to next step
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/next");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Status after next
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal("Task_2", processState.CurrentTask.ElementId);
            #endregion

            #region GetUpdated instance to check pdf
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, instancePath);
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            instance = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));
            IEnumerable<DataElement> lockedDataElements = instance.Data.Where(r => r.Locked == true);
            Assert.Single(lockedDataElements);
            #endregion

            #region Get Form DataElement

            dataType = application.DataTypes.FirstOrDefault(r => r.TaskId != null && r.TaskId.Equals(processState.CurrentTask.ElementId));

            DataElement dataElementForm = instance.Data.FirstOrDefault(r => r.DataType.Equals(dataType.Id));

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, instancePath + "/data/" + dataElementForm.Id);

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            SvarPaaNabovarselType skjema = (SvarPaaNabovarselType)JsonConvert.DeserializeObject(responseContent, typeof(SvarPaaNabovarselType));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            #endregion
            #region Update Form DataElement
            string requestJson = JsonConvert.SerializeObject(skjema);
            StringContent httpContent = new StringContent(requestJson, Encoding.UTF8, "application/json");

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, instancePath + "/data/" + dataElementForm.Id)
            {
                Content = httpContent
            };
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            #endregion
            #region push to next step
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/next");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();

            // Expect conflict since the form contains validation errors that needs to be resolved before moving to next task in process.
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            #endregion

            #region Validate data in Task_2 (the form)
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/validate");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));
            Assert.Single(messages);
            #endregion

            #region Update Form DataElement with missing value
            skjema.nabo = new NaboGjenboerType();
            skjema.nabo.epost = "ola.nordmann@online.no";
            requestJson = JsonConvert.SerializeObject(skjema);
            httpContent = new StringContent(requestJson, Encoding.UTF8, "application/json");
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, instancePath + "/data/" + dataElementForm.Id)
            {
                Content = httpContent
            };
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            #endregion

            #region push to confirm task
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/next");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Status after next
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Task_3", processState.CurrentTask.ElementId);
            #endregion

            #region push to end step
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/next");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Status after next
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(processState.CurrentTask);
            Assert.Equal("EndEvent_1", processState.EndEvent);
            #endregion

            TestDataUtil.DeleteInstanceAndData("dibk", "nabovarsel", 1337, new Guid(createdInstance.Id.Split('/')[1]));
        }

        /// <summary>
        /// This test do the following
        /// 1. Instansiates a app instance with a form and a message as an app
        /// 2. End user calls instance API and get overview over the data in a instance
        /// 3. End user calls application metadata to get an overview over where data should be shown.
        /// 4. Gets the data for Task_1
        /// 5. Validate instance
        /// 6. Push instance to Task_2
        /// 7. Gets data for Task 2
        /// 8. Tries to push to next task, but got error cause of validation error
        /// 9. Validation data
        /// 10. Updates data to correct it
        /// 11. Push to next
        /// 12. Verify Process state
        /// 13. Push to next and end task
        /// 14. Verify Process state
        /// </summary>
        [Fact]
        public async void NaboVarselEndToEndTestV2()
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
            svar.eiendomByggested = new EiendomListe();
            svar.eiendomByggested.eiendom = new List<EiendomType>();
            svar.eiendomByggested.eiendom.Add(new EiendomType() { adresse = new EiendommensAdresseType() { postnr = "8450" }, kommunenavn = "Hadsel" });
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
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/dibk/nabovarsel/api/v1/applicationmetadata");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Application application = (Application)JsonConvert.DeserializeObject(responseContent, typeof(Application));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Message DataElement

            // In this application the message element is connected to Task_1. Find the datatype for this task and retrive this from storage
            DataType dataType = application.DataTypes.FirstOrDefault(r => r.TaskId != null && r.TaskId.Equals(instance.Process.CurrentTask.ElementId));
            DataElement dataElementMessage = instance.Data.FirstOrDefault(r => r.DataType.Equals(dataType.Id));
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, instancePath + "/data/" + dataElementMessage.Id);
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Melding melding = (Melding)JsonConvert.DeserializeObject(responseContent, typeof(Melding));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Informasjon om tiltak", melding.MessageTitle);
            #endregion

            #region Get Status
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
            #endregion

            #region Validate instance (the message element)
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/validate");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            List<ValidationIssue> messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));
            Assert.Empty(messages);
            #endregion

            // TODO. Add verification of not able to update message and check that statues is updated
            #region push to next step
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/nextv2");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Status after next
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal("Task_2", processState.CurrentTask.ElementId);
            #endregion

            #region GetUpdated instance to check pdf
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, instancePath);
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            instance = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));
            IEnumerable<DataElement> lockedDataElements = instance.Data.Where(r => r.Locked == true);
            Assert.Single(lockedDataElements);
            #endregion

            #region Get Form DataElement

            dataType = application.DataTypes.FirstOrDefault(r => r.TaskId != null && r.TaskId.Equals(processState.CurrentTask.ElementId));

            DataElement dataElementForm = instance.Data.FirstOrDefault(r => r.DataType.Equals(dataType.Id));

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, instancePath + "/data/" + dataElementForm.Id);

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            SvarPaaNabovarselType skjema = (SvarPaaNabovarselType)JsonConvert.DeserializeObject(responseContent, typeof(SvarPaaNabovarselType));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            #endregion
            #region Update Form DataElement
            string requestJson = JsonConvert.SerializeObject(skjema);
            StringContent httpContent = new StringContent(requestJson, Encoding.UTF8, "application/json");

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, instancePath + "/data/" + dataElementForm.Id)
            {
                Content = httpContent
            };
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            #endregion
            #region push to next step
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/nextv2");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();

            // Expect conflict since the form contains validation errors that needs to be resolved before moving to next task in process.
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            #endregion

            #region Validate data in Task_2 (the form)
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/validate");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));
            Assert.Single(messages);
            #endregion

            #region Update Form DataElement with missing value
            skjema.nabo = new NaboGjenboerType();
            skjema.nabo.epost = "ola.nordmann@online.no";
            requestJson = JsonConvert.SerializeObject(skjema);
            httpContent = new StringContent(requestJson, Encoding.UTF8, "application/json");
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, instancePath + "/data/" + dataElementForm.Id)
            {
                Content = httpContent
            };
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            #endregion

            #region push to confirm task
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/nextv2");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Status after next
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Task_3", processState.CurrentTask.ElementId);
            #endregion

            #region push to end step
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/nextv2");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Status after next
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(processState.CurrentTask);
            Assert.Equal("EndEvent_1", processState.EndEvent);
            #endregion

            TestDataUtil.DeleteInstanceAndData("dibk", "nabovarsel", 1337, new Guid(createdInstance.Id.Split('/')[1]));
        }

        /// <summary>
        /// This test do the following
        /// 1. Instansiates a app instance with a form and a message as an app
        /// 2. End user calls instance API and get overview over the data in a instance
        /// 3. End user calls application metadata to get an overview over where data should be shown.
        /// 4. Gets the data for Task_1
        /// 5. Validate instance
        /// 6. Push instance to Task_2
        /// 7. Gets data for Task 2
        /// 8. Tries to push to next task, but got error cause of validation error
        /// 9. Validation data
        /// 10. Updates data to correct it
        /// 11. Push to next
        /// 12. Verify Process state
        /// 13. Push to next and end task
        /// 14. Verify Process state
        /// </summary>
        [Fact]
        public async void NaboVarselEndToEndTestWithReturnV2()
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
            svar.eiendomByggested = new EiendomListe();
            svar.eiendomByggested.eiendom = new List<EiendomType>();
            svar.eiendomByggested.eiendom.Add(new EiendomType() { adresse = new EiendommensAdresseType() { postnr = "8450" }, kommunenavn = "Hadsel" });
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
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, "/dibk/nabovarsel/api/v1/applicationmetadata");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Application application = (Application)JsonConvert.DeserializeObject(responseContent, typeof(Application));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Message DataElement

            // In this application the message element is connected to Task_1. Find the datatype for this task and retrive this from storage
            DataType dataType = application.DataTypes.FirstOrDefault(r => r.TaskId != null && r.TaskId.Equals(instance.Process.CurrentTask.ElementId));
            DataElement dataElementMessage = instance.Data.FirstOrDefault(r => r.DataType.Equals(dataType.Id));
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, instancePath + "/data/" + dataElementMessage.Id);
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Melding melding = (Melding)JsonConvert.DeserializeObject(responseContent, typeof(Melding));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Informasjon om tiltak", melding.MessageTitle);
            #endregion

            #region Get Status
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            ProcessState processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal("Task_1", processState.CurrentTask.ElementId);
            #endregion

            #region Validate instance (the message element)
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/validate");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            List<ValidationIssue> messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));
            Assert.Empty(messages);
            #endregion

            // TODO. Add verification of not able to update message and check that statues is updated
            #region push to next step
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/nextv2");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Status after next
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal("Task_2", processState.CurrentTask.ElementId);
            #endregion

            #region GetUpdated instance to check pdf
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, instancePath);
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            instance = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));
            IEnumerable<DataElement> lockedDataElements = instance.Data.Where(r => r.Locked == true);
            Assert.Single(lockedDataElements);
            #endregion

            #region Get Form DataElement

            dataType = application.DataTypes.FirstOrDefault(r => r.TaskId != null && r.TaskId.Equals(processState.CurrentTask.ElementId));

            DataElement dataElementForm = instance.Data.FirstOrDefault(r => r.DataType.Equals(dataType.Id));

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, instancePath + "/data/" + dataElementForm.Id);

            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            SvarPaaNabovarselType skjema = (SvarPaaNabovarselType)JsonConvert.DeserializeObject(responseContent, typeof(SvarPaaNabovarselType));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            #endregion
            #region Update Form DataElement
            string requestJson = JsonConvert.SerializeObject(skjema);
            StringContent httpContent = new StringContent(requestJson, Encoding.UTF8, "application/json");

            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, instancePath + "/data/" + dataElementForm.Id)
            {
                Content = httpContent
            };
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            #endregion
            #region push to next step
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/nextv2");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();

            // Expect conflict since the form contains validation errors that needs to be resolved before moving to next task in process.
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            #endregion

            #region Validate data in Task_2 (the form)
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/validate");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));
            Assert.Single(messages);
            #endregion

            #region Update Form DataElement with missing value
            skjema.nabo = new NaboGjenboerType();
            skjema.nabo.epost = "ola.nordmann@online.no";
            requestJson = JsonConvert.SerializeObject(skjema);
            httpContent = new StringContent(requestJson, Encoding.UTF8, "application/json");
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, instancePath + "/data/" + dataElementForm.Id)
            {
                Content = httpContent
            };
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            #endregion

            #region push to confirm task
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/nextv2");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Status after next
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Task_3", processState.CurrentTask.ElementId);
            #endregion

            #region push back to data task
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/nextv2/?elementId=Task_2");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Status after next
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Task_2", processState.CurrentTask.ElementId);
            #endregion

            #region push to confirm task
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/nextv2");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Status after next
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Task_3", processState.CurrentTask.ElementId);
            #endregion

            #region push to end step
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, $"{instancePath}/process/nextv2");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            #endregion

            #region Get Status after next
            httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, $"{instancePath}/process");
            response = await client.SendAsync(httpRequestMessage);
            responseContent = await response.Content.ReadAsStringAsync();
            processState = (ProcessState)JsonConvert.DeserializeObject(responseContent, typeof(ProcessState));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(processState.CurrentTask);
            Assert.Equal("EndEvent_1", processState.EndEvent);
            #endregion

            TestDataUtil.DeleteInstanceAndData("dibk", "nabovarsel", 1337, new Guid(createdInstance.Id.Split('/')[1]));
        }
    }
}
