using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Platform.Storage.IntegrationTest.Clients;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.IntegrationTest.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    ///  Tests data service REST api.
    /// </summary>
    [Collection("Sequential")]
    public class DataElementStorageTests : IClassFixture<PlatformStorageFixture>, IClassFixture<BlobStorageFixture>, IClassFixture<CosmosDBFixture>, IDisposable
    {
        private readonly PlatformStorageFixture fixture;
        private readonly HttpClient client;
        private readonly InstanceClient instanceClient;
        private readonly string testOrg = "tests";
        private readonly string testAppId = "tests/sailor";
        private readonly int testInstanceOwnerId = 500;
        private readonly string dataType = "default";
        private CloudBlobClient _blobClient;
        private CloudBlobContainer _blobContainer;
        private bool blobSetup = false;
        private string _validToken;

        private readonly string versionPrefix = "/storage/api/v1";

        /// <summary>
        /// Initializes a new instance of the <see cref="DataElementStorageTests"/> class.
        /// </summary>
        /// <param name="fixture">the fixture object which talks to the SUT (System Under Test)</param>
        public DataElementStorageTests(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.client = this.fixture.Client;
            this.instanceClient = new InstanceClient(this.client);

            // connect to azure blob storage
            StorageCredentials storageCredentials = new StorageCredentials("devstoreaccount1", "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==");
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);

            StorageUri storageUrl = new StorageUri(new Uri("http://127.0.0.1:10000/devstoreaccount1"));
            _blobClient = new CloudBlobClient(storageUrl, storageCredentials);
            _blobContainer = _blobClient.GetContainerReference("servicedata");
            _validToken = PrincipalUtil.GetToken(1);   

            CreateTestApplication();
        }

        /// <summary>
        /// Make sure repository is cleaned after the tests is run.
        /// </summary>
        public void Dispose()
        {
            string requestUri = $"{versionPrefix}/instances?org={testOrg}";

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
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
        /// Get data element as org updates download
        /// </summary>
        [Fact]
        public async void Get_DataElement_AsOrg_UpdatesDownloaded_Ok()
        {
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            DataElement dataElement = (await CreateInstanceWithData(1, false))[0];

            Assert.NotNull(dataElement);

            string dataPathWithDataGuid = $"{versionPrefix}/instances/{testInstanceOwnerId}/{dataElement.instanceGuid}/data/{dataElement.Id}";

            // Get data file once as ORG tests
            string token = PrincipalUtil.GetOrgToken("tests");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            HttpResponseMessage getResponse = await client.GetAsync($"{dataPathWithDataGuid}");
            getResponse.EnsureSuccessStatusCode();
            string json = await getResponse.Content.ReadAsStringAsync();

            // Get instance as user to check downloads
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
            getResponse = await client.GetAsync($"{versionPrefix}/instances/{testInstanceOwnerId}/{dataElement.instanceGuid}");
            getResponse.EnsureSuccessStatusCode();

            Instance instance = JsonConvert.DeserializeObject<Instance>(await getResponse.Content.ReadAsStringAsync());

            Assert.Single(instance.Data);

            DataElement actualDataElement = instance.Data[0];

            Assert.Single(actualDataElement.AppOwner.Downloaded);
        }

        /// <summary>
        /// Delete data element.
        /// </summary>
        [Fact]
        public async void Delete_DataElement_Ok()
        {
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            DataElement dataElement = (await CreateInstanceWithData(1))[0];

            Assert.NotNull(dataElement);

            string dataPathWithDataGuid = $"{versionPrefix}/instances/{testInstanceOwnerId}/{dataElement.instanceGuid}/data/{dataElement.Id}";

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
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
        /// Scenario:
        ///   Request to add confirm download to data element.
        /// Expected:
        ///   Data element is updated with confirmation of download.
        /// Success:
        ///   AppOwner.DownloadConfirmed field is populated on data element. 
        /// </summary>
        [Fact]
        public async void Put_ConfirmDownload_OnADataGuid_Ok()
        {
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            DataElement dataElement = (await CreateInstanceWithData(1))[0];

            Assert.NotNull(dataElement);

            string instanceId = $"{testInstanceOwnerId}/{dataElement.instanceGuid}";

            string dataPathWithDataGuid = $"{versionPrefix}/instances/{instanceId}/dataelements/{dataElement.Id}";
            HttpContent content = new StringContent(string.Empty);

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
            HttpResponseMessage getResponse = await client.PutAsync($"{dataPathWithDataGuid}/confirmDownload", content);

            getResponse.EnsureSuccessStatusCode();

            string json = await getResponse.Content.ReadAsStringAsync();
            DataElement actual = JsonConvert.DeserializeObject<DataElement>(json);

            Assert.Equal(dataElement.Id, actual.Id);
            Assert.NotNull(actual.AppOwner.DownloadConfirmed);
        }

        /// <summary>
        /// Scenario:
        ///   Add confirm download to all data elements on an instance
        /// Expected:
        ///   Data elements are updated with confirmation of download.
        /// Success:
        ///   AppOwner.DownloadConfirmed field is populated for all data elements. 
        /// </summary>
        [Fact]
        public async void Put_ConfirmDownload_OnAllData_Ok()
        {
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            List<DataElement> dataElements = await CreateInstanceWithData(2);

            Assert.NotNull(dataElements);

            string instanceId = $"{testInstanceOwnerId}/{dataElements[0].instanceGuid}";

            string dataPathWithData = $"{versionPrefix}/instances/{instanceId}/dataelements";
            HttpContent content = new StringContent(string.Empty);

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
            HttpResponseMessage getResponse = await client.PutAsync($"{dataPathWithData}/confirmDownload", content);

            getResponse.EnsureSuccessStatusCode();

            string json = await getResponse.Content.ReadAsStringAsync();
            List<DataElement> actual = JsonConvert.DeserializeObject<List<DataElement>>(json);

            Assert.Equal(2, actual.Count);
            Assert.NotNull(actual[0].AppOwner.DownloadConfirmed);
            Assert.NotNull(actual[1].AppOwner.DownloadConfirmed);
        }

        /// <summary>
        /// Attemt to download a locked data file.
        /// </summary>
        [Fact]
        public async void Put_OnLockedDataElement_ReturnsConflict()
        {
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            List<DataElement> dataElements = await CreateInstanceWithData(1);

            DataElement dataElement = dataElements[0];
            Assert.NotNull(dataElement);

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
            string instanceId = $"{testInstanceOwnerId}/{dataElement.instanceGuid}";
            string dataElementResourcePath = $"{versionPrefix}/instances/{instanceId}/dataelements/{dataElement.Id}";
            string dataResourcePath = $"{versionPrefix}/instances/{instanceId}/data/{dataElement.Id}";

            // Lock and update data element
            dataElement.Locked = true;            
            HttpResponseMessage putDataelementResponse = await client.PutAsync($"{dataElementResourcePath}", dataElement.AsJson());
            putDataelementResponse.EnsureSuccessStatusCode();

            // Attemt to upload data file
            HttpResponseMessage putDataReponse = await client.PutAsync($"{dataResourcePath}", new StringContent("any content"));
            
            Assert.Equal(HttpStatusCode.Conflict, putDataReponse.StatusCode);
        }

        private async Task<List<DataElement>> CreateInstanceWithData(int count, bool setDownload = true)
        {
            List<DataElement> dataElements = new List<DataElement>();

            // create instance
            Instance newInstance = await instanceClient.PostInstances(testAppId, testInstanceOwnerId);
          
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
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
                HttpResponseMessage postResponse = await client.PostAsync(requestUri, jsonContent.AsJson());

                DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(await postResponse.Content.ReadAsStringAsync());

                if (setDownload)
                {
                    // update downloaded structure on data element
                    dataElement.AppOwner ??= new ApplicationOwnerDataState();
                    dataElement.AppOwner.Downloaded = new List<DateTime>
                    {
                        DateTime.UtcNow
                    };

                    requestUri = $"{versionPrefix}/instances/{newInstance.Id}/dataelements/{dataElement.Id}";
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
                    HttpResponseMessage putResponse = await client.PutAsync(requestUri, dataElement.AsJson());

                    dataElements.Add(JsonConvert.DeserializeObject<DataElement>(await putResponse.Content.ReadAsStringAsync()));
                }
                else
                {
                    dataElements.Add(dataElement);
                }
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

        private async Task EnsureValidStorage()
        {
            await _blobContainer.CreateIfNotExistsAsync();
            blobSetup = true;
        }
    }
}
