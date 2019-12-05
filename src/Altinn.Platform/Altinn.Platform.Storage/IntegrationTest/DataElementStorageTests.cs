using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    ///  Tests data service REST api.
    /// </summary>
    public class DataElementStorageTests : IClassFixture<PlatformStorageFixture>, IDisposable
    {
        private readonly PlatformStorageFixture fixture;
        private readonly HttpClient client;
        private readonly InstanceClient storageClient;
        private string instanceId;
        private readonly string testOrg = "tests";
        private readonly string testAppId = "tests/sailor";
        private readonly int testInstanceOwnerId = 500;
        private readonly string dataType = "default";

        private readonly string versionPrefix = "/storage/api/v1";

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceStorageTests"/> class.
        /// </summary>
        /// <param name="fixture">the fixture object which talks to the SUT (System Under Test)</param>
        public DataElementStorageTests(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.client = this.fixture.Client;
            this.storageClient = new InstanceClient(this.client);

            CreateTestApplication();
        }

        /// <summary>
        /// Make sure repository is cleaned after the tests is run.
        /// </summary>
        public void Dispose()
        {
            string requestUri = $"{versionPrefix}/instances?org={testOrg}";

            HttpResponseMessage response = client.GetAsync(requestUri).Result;
            string content = response.Content.ReadAsStringAsync().Result;

            if (response.StatusCode == HttpStatusCode.OK)
            {
                JObject jsonObject = JObject.Parse(content);
                List<Instance> instances = jsonObject["instances"].ToObject<List<Instance>>();

                foreach (Instance instance in instances)
                {
                    string url = $"{versionPrefix}/instances/{instance.Id}";

                    if (instance.Data != null)
                    {
                        foreach (DataElement element in instance.Data)
                        {
                            string filename = element.BlobStoragePath;
                            string dataUrl = "/data/" + element.Id;

                            string dataDeleteUrl = url + dataUrl;

                            client.DeleteAsync(dataDeleteUrl);
                        }
                    }

                    string instanceUrl = $"{versionPrefix}/instances/{instance.Id}?hard=true";
                    client.DeleteAsync(instanceUrl);
                }
            }

            DeleteApplicationMetadata();
        }

        /// <summary>
        /// Delete data element.
        /// </summary>
        [Fact]
        public async void Delete_DataElement_Ok()
        {
            DataElement dataElement = (await CreateInstanceWithData(1))[0];

            Assert.NotNull(dataElement);

            string dataPathWithDataGuid = $"{versionPrefix}/instances/{testInstanceOwnerId}/{dataElement.instanceGuid}/data/{dataElement.Id}";

            HttpResponseMessage getResponse = await client.DeleteAsync($"{dataPathWithDataGuid}");

            getResponse.EnsureSuccessStatusCode();

            string json = await getResponse.Content.ReadAsStringAsync();            

            Assert.Equal("true", json);

            getResponse = await client.GetAsync($"{versionPrefix}/instances/{testInstanceOwnerId}/{dataElement.instanceGuid}");
            getResponse.EnsureSuccessStatusCode();

            Instance instance = JsonConvert.DeserializeObject<Instance>(await getResponse.Content.ReadAsStringAsync());

            Assert.Empty(instance.Data);
        }

        /// <summary>
        /// Adds confirm download to data element.
        /// </summary>
        [Fact]
        public async void Put_ConfirmDownload_OnADataGuid_Ok()
        {
            DataElement dataElement = (await CreateInstanceWithData(1))[0];

            Assert.NotNull(dataElement);

            string instanceId = $"{testInstanceOwnerId}/{dataElement.instanceGuid}";

            string dataPathWithDataGuid = $"{versionPrefix}/instances/{instanceId}/dataelements/{dataElement.Id}";
            HttpContent content = new StringContent(string.Empty);
            
            HttpResponseMessage getResponse = await client.PutAsync($"{dataPathWithDataGuid}/confirmDownload", content);

            getResponse.EnsureSuccessStatusCode();

            string json = await getResponse.Content.ReadAsStringAsync();
            DataElement actual = JsonConvert.DeserializeObject<DataElement>(json);

            Assert.Equal(dataElement.Id, actual.Id);
            Assert.NotNull(actual.AppOwner.DownloadConfirmed);
        }

        /// <summary>
        /// Adds confirm download to all elements.
        /// </summary>
        [Fact]
        public async void Put_ConfirmDownload_OnAllData_Ok()
        {
            List<DataElement> dataElements = await CreateInstanceWithData(2);

            Assert.NotNull(dataElements);

            string instanceId = $"{testInstanceOwnerId}/{dataElements[0].instanceGuid}";

            string dataPathWithData = $"{versionPrefix}/instances/{instanceId}/dataelements";
            HttpContent content = new StringContent(string.Empty);

            HttpResponseMessage getResponse = await client.PutAsync($"{dataPathWithData}/confirmDownload", content);

            getResponse.EnsureSuccessStatusCode();

            string json = await getResponse.Content.ReadAsStringAsync();
            List<DataElement> actual = JsonConvert.DeserializeObject<List<DataElement>>(json);

            Assert.Equal(2, actual.Count);
            Assert.NotNull(actual[0].AppOwner.DownloadConfirmed);
            Assert.NotNull(actual[1].AppOwner.DownloadConfirmed);
        }

        private async Task<List<DataElement>> CreateInstanceWithData(int count)
        {
            List<DataElement> dataElements = new List<DataElement>();

            // create instance
            Instance newInstance = await storageClient.PostInstances(testAppId, testInstanceOwnerId);
          
            for (int i = 0; i < count; i++)
            {
                object jsonContent = new
                {
                    number = i,
                    universe = 42,
                    årsjul = 365,
                    text = "Fem flotte åer er bedre en to ærlige øl!",
                };

                string requestUri = $"{versionPrefix}/instances/{newInstance.Id}/data?dataType={dataType}";

                // post the file
                HttpResponseMessage postResponse = await client.PostAsync(requestUri, jsonContent.AsJson());

                DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(await postResponse.Content.ReadAsStringAsync());

                // update downloaded structure on data element
                dataElement.AppOwner ??= new ApplicationOwnerDataState();
                dataElement.AppOwner.Downloaded = new List<DateTime>();
                dataElement.AppOwner.Downloaded.Add(DateTime.UtcNow);

                requestUri = $"{versionPrefix}/instances/{newInstance.Id}/dataelements/{dataElement.Id}";
                HttpResponseMessage putResponse = await client.PutAsync(requestUri, dataElement.AsJson());

                dataElements.Add(JsonConvert.DeserializeObject<DataElement>(await putResponse.Content.ReadAsStringAsync()));
            }

            return dataElements;
        }
        
        private Application CreateTestApplication()
        {
            ApplicationClient appClient = new ApplicationClient(client);

            try
            {
                Application existingApp = appClient.GetApplication(testAppId);
                return existingApp;
            }
            catch (Exception)
            {
                // do nothing.
            }

            LanguageString title = new LanguageString
            {
                { "nb", "Testapplikasjon" },
                { "en", "Test application" }
            };

            return appClient.CreateApplication(testAppId, title);
        }

        private Application DeleteApplicationMetadata()
        {
            ApplicationClient appClient = new ApplicationClient(client);

            Application existingApp = appClient.DeleteApplication(testAppId);

            return existingApp;
        }
    }
}
