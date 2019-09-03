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
        private MessageBoxInstanceData testdata;
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

            testdata = new MessageBoxInstanceData();
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

            // Assert
            Assert.Equal(expectedCount, actualCount);
            Assert.Equal(expectedTitle, actualTitle);

            // Cleanup
            await DeleteInstances(testInstances);
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

        private async Task<bool> UploadInstances(List<Instance> instances)
        {
            foreach (Instance instance in instances)
            {
                await instanceClient.PostInstances(instance.AppId, instance);
            }

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
