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
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    /// Test class for instance controller.
    /// </summary>
    public class InstanceControllerTest : IClassFixture<PlatformStorageFixture>
    {
        private static DocumentClient documentClient;
        private readonly PlatformStorageFixture fixture;
        private readonly HttpClient client;
        private readonly List<string> appIds;
        private readonly ILogger<InstanceControllerTest> logger;

        private readonly ApplicationClient appClient;
        private readonly TestData testdata;
        private readonly string versionPrefix = "/storage/api/v1";

        private readonly AzureCosmosSettings cosmosSettings = new AzureCosmosSettings()
        {
            Collection = "Instance",
            Database = "ServiceEngine",
            EndpointUri = "https://localhost:8081",
            PrimaryKey = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceControllerTest"/> class.
        /// </summary>
        /// <param name="fixture">the fixture object which talks to the SUT (System Under Test)</param>
        public InstanceControllerTest(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.client = this.fixture.Client;
            this.appClient = new ApplicationClient(this.client);

            documentClient = new DocumentClient(new Uri(this.cosmosSettings.EndpointUri), this.cosmosSettings.PrimaryKey, new ConnectionPolicy
            {
                ConnectionMode = ConnectionMode.Gateway,
                ConnectionProtocol = Protocol.Https,
            });

            this.testdata = new TestData();
            this.appIds = this.testdata.GetAppIds();
            this.CreateTestApplications();
        }

        /// <summary>
        /// Make sure repository is cleaned after the tests is run.
        /// </summary>
        public void Dispose()
        {
            string requestUri = $"{this.versionPrefix}/instances?instanceOwnerId={this.testdata.GetInstanceOwnerId()}";

            HttpResponseMessage response = this.client.GetAsync(requestUri).Result;
            string content = response.Content.ReadAsStringAsync().Result;

            if (response.StatusCode == HttpStatusCode.OK)
            {
                JObject jsonObject = JObject.Parse(content);
                List<Instance> instances = jsonObject["instances"].ToObject<List<Instance>>();

                foreach (Instance instance in instances)
                {
                    string url = $"{this.versionPrefix}/instances/{instance.Id}";

                    if (instance.Data != null)
                    {
                        foreach (DataElement element in instance.Data)
                        {
                            string filename = element.StorageUrl;
                            string dataUrl = "/data/" + element.Id;

                            string dataDeleteUrl = url + dataUrl;

                            this.client.DeleteAsync(dataDeleteUrl);
                        }
                    }

                    string instanceUrl = $"{this.versionPrefix}/instances/{instance.Id}?hard=true";
                    this.client.DeleteAsync(instanceUrl);
                }
            }

            this.DeleteApplicationMetadata();
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
            HttpResponseMessage response = await this.client.PutAsync($"{this.versionPrefix}/instances/{instance.InstanceOwnerId}/{instance.Id}/restore", null);
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
            HttpResponseMessage response = await this.client.PutAsync($"{this.versionPrefix}/instances/{instance.InstanceOwnerId}/{instance.Id}/restore", null);
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
            HttpResponseMessage response = await this.client.PutAsync($"{this.versionPrefix}/instances/{instance.InstanceOwnerId}/{instance.Id}/restore", null);
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
        /// Expeted: 
        /// Success: 
        /// </summary>
        [Fact]
        public async void RestoreInstance_TC04()
        {
            // Arrange
            string instanceId = Guid.NewGuid().ToString();
            string expectedMsg = $"Didn't find the object that should be restored with instanceId={testdata.GetInstanceOwnerId()}/{instanceId}";
            HttpStatusCode expectedStatusCode = HttpStatusCode.NotFound;

            // Act
            HttpResponseMessage response = await this.client.PutAsync($"{this.versionPrefix}/instances/{testdata.GetInstanceOwnerId()}/{instanceId}/restore", null);
            HttpStatusCode actualStatusCode = response.StatusCode;
            string actualMgs = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();

            // Assert
             Assert.Equal(expectedMsg, actualMgs);
            Assert.Equal(expectedStatusCode, actualStatusCode);
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

        private async Task<Instance> UploadInstance(Instance instance)
        {
            ResourceResponse<Document> res = await documentClient.CreateDocumentAsync(UriFactory.CreateDocumentCollectionUri(cosmosSettings.Database, cosmosSettings.Collection), instance);
            return JsonConvert.DeserializeObject<Instance>(res.Resource.ToString());
        }

        private async Task<bool> DeleteInstance(Instance instance)
        {
            string instanceUrl = $"{versionPrefix}/instances/{instance.Id}?hard=true";
            await client.DeleteAsync(instanceUrl);

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
