using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Xml.Serialization;

using Altinn.App;
using Altinn.App.IntegrationTests;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Apps.nsm.klareringsportalen.models;
using App.IntegrationTests.Utils;

using Newtonsoft.Json;
using Xunit;

namespace App.IntegrationTestsRef.EndToEndTests
{
    public class NsmKlareringsportalenEndToEndTests : IClassFixture<CustomWebApplicationFactory<Startup>>
    {
        private readonly CustomWebApplicationFactory<Altinn.App.Startup> _factory;

        public NsmKlareringsportalenEndToEndTests(CustomWebApplicationFactory<Altinn.App.Startup> factory)
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
        public async void NsmKlareringsportalenEndToEndTest()
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

            ePOB_M svar = new ePOB_M();
            svar.DeusRequest = new Deusrequest();
            svar.DeusRequest.clearauthority = "Sivil";
            svar.DeusRequest.nationallevel = "1";
           
            string xml = string.Empty;
            using (var stringwriter = new System.IO.StringWriter())
            {
                XmlSerializer serializer = new XmlSerializer(typeof(ePOB_M));
                serializer.Serialize(stringwriter, svar);
                xml = stringwriter.ToString();
            }

            #region Org instansiates form with message
            string instanceAsString = JsonConvert.SerializeObject(instanceTemplate);

            string boundary = "abcdefgh";
            MultipartFormDataContent formData = new MultipartFormDataContent(boundary)
            {
                { new StringContent(instanceAsString, Encoding.UTF8, "application/json"), "instance" },
                { new StringContent(xml, Encoding.UTF8, "application/xml"), "epob" },
            };

            Uri uri = new Uri("/nsm/klareringsportalen/instances", UriKind.Relative);

            /* TEST */

            HttpClient client = SetupUtil.GetTestClient(_factory, "nsm", "klareringsportalen");
            string token = PrincipalUtil.GetOrgToken("nsm");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpResponseMessage response = await client.PostAsync(uri, formData);
            string responsestring = await response.Content.ReadAsStringAsync();

            response.EnsureSuccessStatusCode();

            Assert.True(response.StatusCode == HttpStatusCode.Created);

            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());

            Assert.NotNull(createdInstance);
            Assert.Single(createdInstance.Data);
            #endregion

            #region end user gets instance

            // Reset token and client to end user
            client = SetupUtil.GetTestClient(_factory, "nsm", "klareringsportalen");
            token = PrincipalUtil.GetToken(1337, 4);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            string instancePath = "/nsm/klareringsportalen/instances/" + createdInstance.Id;

            HttpRequestMessage httpRequestMessage =
            new HttpRequestMessage(HttpMethod.Get, instancePath);

            response = await client.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();
            Instance instance = (Instance)JsonConvert.DeserializeObject(responseContent, typeof(Instance));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("1337", instance.InstanceOwner.PartyId);
            Assert.Equal("Task_1", instance.Process.CurrentTask.ElementId);
            Assert.Single(instance.Data);
            #endregion

            TestDataUtil.DeleteInstanceAndData("nsm", "klareringsportalen", 1337, new Guid(createdInstance.Id.Split('/')[1]));
        }
    }
}
