using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Storage.Interface.Models;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    /// Test class for MessageBoxInstancesController
    /// </summary>
    public class MessageBoxInstancesControllerTest : IClassFixture<PlatformStorageFixture>, IDisposable
    {
        private readonly PlatformStorageFixture fixture;
        private readonly HttpClient client;
        private InstanceClient instanceClient;
        private ApplicationClient appClient;
        private TestData testdata;
        private readonly List<string> appIds;
        private static DocumentClient _client;
        private AzureCosmosSettings _cosmosSettings = new AzureCosmosSettings()
        {
            Collection = "Instance",
            Database = "ServiceEngine",
            EndpointUri = "https://localhost:8081",
            PrimaryKey = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=="
        };

        private readonly string versionPrefix = "/storage/api/v1";

        /// <summary>
        /// Initializes a new instance of the <see cref="MessageBoxInstancesControllerTest"/> class.
        /// </summary>
        /// <param name="fixture">the fixture object which talks to the SUT (System Under Test)</param>
        public MessageBoxInstancesControllerTest(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.client = this.fixture.Client;
            this.instanceClient = new InstanceClient(this.client);
            this.appClient = new ApplicationClient(this.client);

            _client = new DocumentClient(new Uri(_cosmosSettings.EndpointUri), _cosmosSettings.PrimaryKey, new ConnectionPolicy
            {
                ConnectionMode = ConnectionMode.Gateway,
                ConnectionProtocol = Protocol.Https,
            });

            testdata = new TestData();
            appIds = testdata.GetAppIds();
            CreateTestApplications();
        }

        /// <summary>
        /// Make sure repository is cleaned after the tests is run.
        /// </summary>
        public void Dispose()
        {
            string requestUri = $"{versionPrefix}/instances?instanceOwnerId={testdata.GetInstanceOwnerId()}";

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
                            string filename = element.StorageUrl;
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
        /// Scenario: Request list of instances active without language settings.
        /// Expeted: Requested language is not available, but a list of instances is returned regardless.
        /// Success: Default language is used for title, and the title contains the word "bokmål".
        /// </summary>
        [Fact]
        public async void GetInstanceList_TC01()
        {
            // Arrange
            List<Instance> testInstances = testdata.GetInstances_App3();
            await UploadInstances(testInstances);
            int expectedCount = 2;
            string expectedTitle = "Test applikasjon 3 bokmål";

            // Act
            HttpResponseMessage response = await client.GetAsync($"{versionPrefix}/sbl/instances/{testdata.GetInstanceOwnerId()}?state=active");
            string responseJson = await response.Content.ReadAsStringAsync();
            List<MessageBoxInstance> messageBoxInstances = JsonConvert.DeserializeObject<List<MessageBoxInstance>>(responseJson);

            int actualCount = messageBoxInstances.Count();
            string actualTitle = messageBoxInstances.First().Title;

            // Cleanup
            await DeleteInstances(testInstances);

            // Assert
            Assert.Equal(expectedCount, actualCount);
            Assert.Equal(expectedTitle, actualTitle);
        }

        /// <summary>
        /// Scenario: Request list of instances with language setting english.
        /// Expeted: Requested language is available and a list of instances is returned.
        /// Success: English title is returned in the instances and the title contains the word "english".
        /// </summary>
        [Fact]
        public async void GetInstanceList_TC02()
        {
            // Arrange
            List<Instance> testInstances = testdata.GetInstances_App2();
            await UploadInstances(testInstances);
            int expectedCount = 2;
            string expectedTitle = "Test application 2 english";

            // Act
            HttpResponseMessage response = await client.GetAsync($"{versionPrefix}/sbl/instances/{testdata.GetInstanceOwnerId()}?state=active&language=en");
            string responseJson = await response.Content.ReadAsStringAsync();
            List<MessageBoxInstance> messageBoxInstances = JsonConvert.DeserializeObject<List<MessageBoxInstance>>(responseJson);

            int actualCount = messageBoxInstances.Count();
            string actualTitle = messageBoxInstances.First().Title;

            // Assert
            Assert.Equal(expectedCount, actualCount);
            Assert.Equal(expectedTitle, actualTitle);

            // Cleanup
            await DeleteInstances(testInstances);
        }

        /// <summary>
        /// Scenario: Request list of archived instances.
        /// Expeted: A list of instances is returned regardless.
        /// Success: A single instance is returned.
        /// </summary>
        [Fact]
        public async void GetInstanceList_TC03()
        {
            // Arrange
            List<Instance> testInstances = testdata.GetInstances_App1();
            foreach (Instance item in testInstances)
            {
                await _client.CreateDocumentAsync(UriFactory.CreateDocumentCollectionUri(_cosmosSettings.Database, _cosmosSettings.Collection), item);
            }

            int expectedCount = 1;

            // Act
            HttpResponseMessage response = await client.GetAsync($"{versionPrefix}/sbl/instances/{testdata.GetInstanceOwnerId()}?state=archived");
            string responseJson = await response.Content.ReadAsStringAsync();
            List<MessageBoxInstance> messageBoxInstances = JsonConvert.DeserializeObject<List<MessageBoxInstance>>(responseJson);

            int actualCount = messageBoxInstances.Count();

            // Assert
            Assert.Equal(expectedCount, actualCount);

            // Cleanup
            await DeleteInstances(testInstances);
        }

        private void CreateTestApplications()
        {
            List<Application> apps = testdata.GetApps();
            foreach (Application app in apps)
            {
                try
                {
                    appClient.CreateApplication(app);
                }
                catch (Exception)
                {
                    // do nothing.
                }
            }
        }

        /// <summary>
        /// Scenario: Restore a soft deleted instance in storage.
        /// Expeted: The instance is restored.
        /// Success: True is returned for the http request. 
        /// </summary>
        [Fact]
        public async void RestoreInstance_TC01()
        {
            // Arrange
            Instance instance = await this.UploadInstance(this.testdata.GetSoftDeletedInstance());
            bool expectedResult = true;
            HttpStatusCode expectedStatusCode = HttpStatusCode.OK;

            // Act
            HttpResponseMessage response = await this.client.PutAsync($"{this.versionPrefix}/sbl/instances/{instance.InstanceOwnerId}/{instance.Id}/undelete", null);
            HttpStatusCode actualStatusCode = response.StatusCode;
            string responseJson = await response.Content.ReadAsStringAsync();
            bool actualResult = JsonConvert.DeserializeObject<bool>(responseJson);

            // Assert
            Assert.Equal(expectedResult, actualResult);
            Assert.Equal(expectedStatusCode, actualStatusCode);

            // Cleanup
            await this.DeleteInstance(instance);
        }

        /// <summary>
        /// Scenario: Restore a hard deleted instance in storage
        /// Expeted: It should not be possible to restore a hard deleted instance.
        /// Success: 500 response and an error message is returned.
        /// </summary>
        [Fact]
        public async void RestoreInstance_TC02()
        {
            // Arrange
            Instance instance = await this.UploadInstance(this.testdata.GetHardDeletedInstance());
            HttpStatusCode expectedStatusCode = HttpStatusCode.BadRequest;
            string expectedMsg = "Instance was permanently deleted and cannot be restored.";

            // Act
            HttpResponseMessage response = await this.client.PutAsync($"{this.versionPrefix}/sbl/instances/{instance.InstanceOwnerId}/{instance.Id}/undelete", null);
            string actualMgs = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
            HttpStatusCode actualStatusCode = response.StatusCode;

            // Assert
            Assert.Equal(expectedStatusCode, actualStatusCode);
            Assert.Equal(expectedMsg, actualMgs);

            // Cleanup
            await this.DeleteInstance(instance);
        }

        /// <summary>
        /// Scenario: Restore an archived instance in storage
        /// Expeted: Nothing is done to alter the instance.
        /// Success: True is returned for the http request.
        /// </summary>
        [Fact]
        public async void RestoreInstance_TC03()
        {
            // Arrange
            Instance instance = await this.UploadInstance(this.testdata.GetActiveInstance());
            HttpStatusCode expectedStatusCode = HttpStatusCode.OK;
            bool expectedResult = true;

            // Act
            HttpResponseMessage response = await this.client.PutAsync($"{this.versionPrefix}/sbl/instances/{instance.InstanceOwnerId}/{instance.Id}/undelete", null);
            HttpStatusCode actualStatusCode = response.StatusCode;
            string responseJson = await response.Content.ReadAsStringAsync();
            bool actualResult = JsonConvert.DeserializeObject<bool>(responseJson);

            // Assert
            Assert.Equal(expectedResult, actualResult);
            Assert.Equal(expectedStatusCode, actualStatusCode);

            // Cleanup
            await this.DeleteInstance(instance);
        }

        /// <summary>
        /// Scenario: Non-existent instance to be restored
        /// Expeted: Error code is returned from the controller
        /// Success: Not found error code is returned.
        /// </summary>
        [Fact]
        public async void RestoreInstance_TC04()
        {
            // Arrange
            string instanceId = Guid.NewGuid().ToString();
            string expectedMsg = $"Didn't find the object that should be restored with instanceId={testdata.GetInstanceOwnerId()}/{instanceId}";
            HttpStatusCode expectedStatusCode = HttpStatusCode.NotFound;

            // Act
            HttpResponseMessage response = await this.client.PutAsync($"{this.versionPrefix}/sbl/instances/{testdata.GetInstanceOwnerId()}/{instanceId}/undelete", null);
            HttpStatusCode actualStatusCode = response.StatusCode;
            string actualMgs = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();

            // Assert
            Assert.Equal(expectedMsg, actualMgs);
            Assert.Equal(expectedStatusCode, actualStatusCode);
        }

        /// <summary>
        /// Scenario: Soft delete an active instance in storage.
        /// Expeted: Instance is marked for soft delete.
        /// Success: True is returned for the http request.
        /// </summary>
        [Fact]
        public async void DeleteInstance_TC01()
        {
            // Arrange
            Instance instance = await this.UploadInstance(this.testdata.GetActiveInstance());
            HttpStatusCode expectedStatusCode = HttpStatusCode.OK;
            bool expectedResult = true;

            // Act
            HttpResponseMessage response = await this.client.DeleteAsync($"{this.versionPrefix}/sbl/instances/{instance.InstanceOwnerId}/{instance.Id}?hard=false");        
            HttpStatusCode actualStatusCode = response.StatusCode;
            string responseJson = await response.Content.ReadAsStringAsync();
            bool actualResult = JsonConvert.DeserializeObject<bool>(responseJson);

            Instance storedInstance = await GetInstance(instance.Id, instance.InstanceOwnerId);

            // Assert
            Assert.Equal(expectedResult, actualResult);
            Assert.Equal(expectedStatusCode, actualStatusCode);
            Assert.True(storedInstance.InstanceState.IsDeleted);
            Assert.False(storedInstance.InstanceState.IsMarkedForHardDelete);

            // Cleanup
            await this.DeleteInstance(instance);
        }

        /// <summary>
        /// Scenario: Hard delete a soft deleted instance in storage.
        /// Expeted: Instance is marked for hard delete.
        /// Success: True is returned for the http request.
        /// </summary>
        [Fact]
        public async void DeleteInstance_TC02()
        {
            // Arrange
            Instance instance = await this.UploadInstance(this.testdata.GetSoftDeletedInstance());
            HttpStatusCode expectedStatusCode = HttpStatusCode.OK;
            bool expectedResult = true;

            // Act
            HttpResponseMessage response = await this.client.DeleteAsync($"{this.versionPrefix}/sbl/instances/{instance.InstanceOwnerId}/{instance.Id}?hard=true");
            HttpStatusCode actualStatusCode = response.StatusCode;
            string responseJson = await response.Content.ReadAsStringAsync();
            bool actualResult = JsonConvert.DeserializeObject<bool>(responseJson);

            Instance storedInstance = await GetInstance(instance.Id, instance.InstanceOwnerId);

            // Assert
            Assert.Equal(expectedResult, actualResult);
            Assert.Equal(expectedStatusCode, actualStatusCode);
            Assert.True(storedInstance.InstanceState.IsMarkedForHardDelete);

            // Cleanup
            await this.DeleteInstance(instance);
        }

        private async Task<Instance> GetInstance(string instanceGuid, string instanceOwnerId)
        {
            Instance instance = await _client
                  .ReadDocumentAsync<Instance>(
                      UriFactory.CreateDocumentUri(_cosmosSettings.Database, _cosmosSettings.Collection, instanceGuid),
                      new RequestOptions { PartitionKey = new PartitionKey(instanceOwnerId.ToString()) });

            return instance;
        }

        private async Task<Instance> UploadInstance(Instance instance)
        {
            ResourceResponse<Document> res = await _client.CreateDocumentAsync(UriFactory.CreateDocumentCollectionUri(_cosmosSettings.Database, _cosmosSettings.Collection), instance);
            return JsonConvert.DeserializeObject<Instance>(res.Resource.ToString());
        }

        private async Task<bool> UploadInstances(List<Instance> instances)
        {
            foreach (Instance instance in instances)
            {
              await instanceClient.PostInstances(instance.AppId, instance);
            }

            return true;
        }

        private async Task<bool> DeleteInstance(Instance instance)
        {
            string instanceUrl = $"{versionPrefix}/instances/{instance.Id}?hard=true";
            await client.DeleteAsync(instanceUrl);

            return true;
        }

        private async Task<bool> DeleteInstances(List<Instance> instances)
        {
            foreach (Instance instance in instances)
            {
                string instanceUrl = $"{versionPrefix}/instances/{instance.Id}?hard=true";
                await client.DeleteAsync(instanceUrl);
            }

            return true;
        }

        private void DeleteApplicationMetadata()
        {
            ApplicationClient appClient = new ApplicationClient(client);

            foreach (string id in appIds)
            {
                appClient.DeleteApplication(id);
            }
        }
    }
}
