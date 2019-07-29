using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Storage.Interface.Clients;
using Storage.Interface.Models;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    ///  Tests dataservice REST api.
    /// </summary>
    public class InstancesQueryAndHALTests : IClassFixture<PlatformStorageFixture>, IDisposable
    {
        private readonly PlatformStorageFixture fixture;
        private readonly HttpClient client;
        private InstanceClient storageClient;
        private string instanceId;
        private readonly string testOrg = "tests";
        private string testAppId = "tests/sailor";
        private readonly int testInstanceOwnerId = 500;
        private readonly string elementType = "default";

        private readonly string versionPrefix = "/storage/api/v1";

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceStorageTests"/> class.
        /// </summary>
        /// <param name="fixture">the fixture object which talks to the SUT (System Under Test)</param>
        public InstancesQueryAndHALTests(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.client = this.fixture.Client;
            this.storageClient = new InstanceClient(this.client);

            CreateTestApplication(testAppId);
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
                List<Instance> instances = JsonConvert.DeserializeObject<List<Instance>>(content);

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
        ///  Creates 1000 instances.
        /// </summary>
        [Fact]
        public async Task<bool> CreateTestDataFor1000InstanceOwners()
        {            
            string testAppId = "tdd/m1000";
            string testOrg = "tdd";

            CreateTestApplication(testAppId);

            string[] processTaskIds = { "FormFilling_1", "Submit_1", null };
            string[] processEndStateIds = { "EndEvent_1", null };
            
            Random randomInt = new Random();
            Random randomDay = new Random();
            DateTime start = new DateTime(2019, 1, 1);

            int taskCounter = 0;

            for (int i = 0;  i < 1000; i++)
            {
                int taskId = 0;
                bool isComplete = false;

                if (taskCounter < 200)
                {
                    taskId = 0;
                }
                else if (taskCounter < 400)
                {
                    taskId = 1;
                }
                else 
                {
                    taskId = 2;
                    isComplete = true;
                }

                taskCounter++;

                DateTime dueDate = start.AddDays(randomDay.Next(0, 366));

                Instance instance = new Instance
                {
                    Org = testOrg,
                    AppId = testAppId,
                    InstanceOwnerId = i.ToString(),
                    Workflow = new WorkflowState
                    {
                        CurrentStep = processTaskIds[taskId],
                        IsComplete = isComplete,
                    },
                    DueDateTime = dueDate,
                    VisibleDateTime = dueDate.AddDays(-30),
                    Labels = new List<string>(),
                };

                int labelCounter = 0;
                string[] labelIds = { "zero", "one", "two" };

                if (labelCounter < 100)
                {
                    instance.Labels = null;
                }
                else if (labelCounter < 300)
                {
                    instance.Labels.Add(labelIds[0]);
                }
                else if (labelCounter < 600)
                {
                    instance.Labels.Add(labelIds[1]);
                }
                else
                {                                        
                    instance.Labels.Add(labelIds[1]);
                    instance.Labels.Add(labelIds[2]);
                }

                labelCounter++;

                string requestUri = $"{versionPrefix}/instances?appId={testAppId}";

                HttpResponseMessage response = await client.PostAsync(requestUri, instance.AsJson());
                if (response.IsSuccessStatusCode)
                {
                    string json = await response.Content.ReadAsStringAsync();

                    Instance instanceActual = JsonConvert.DeserializeObject<Instance>(json);
                }
                else
                {
                    throw new Exception(response.ReasonPhrase);
                }
            }

            return true;
        }

        /// <summary>
        ///  Checks that multiple instances can be returned with query param.
        /// </summary>
        [Fact]
        public async void QueryManyInstances()
        {
            string testAppId = "tdd/m1000";

            string url = $"{versionPrefix}/instances?appId={testAppId}&size=100&process.currentTask=Submit_1";

            client.DefaultRequestHeaders.Add("Accept", "application/hal+json");

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string jsonString = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(jsonString);
            int totalHits = jsonObject["totalHits"].Value<int>();

            Assert.Equal(200, totalHits);
        }

        /// <summary>
        ///  Checks that the GET returns an instance owners codes
        /// </summary>
        [Fact]
        public async void GetInstancesForInstanceOwner()
        {
            await storageClient.PostInstances(testAppId, testInstanceOwnerId);
            await storageClient.PostInstances(testAppId, testInstanceOwnerId);

            string url = $"{versionPrefix}/instances/{testInstanceOwnerId}";
            HttpResponseMessage response = await client.GetAsync(url);

            response.EnsureSuccessStatusCode();

            string json = await response.Content.ReadAsStringAsync();
            List<Instance> instances = JsonConvert.DeserializeObject<List<Instance>>(json);

            Assert.Equal(2, instances.Count);
        }

        /// <summary>
        ///  Checks that multiple instances can be returned with org query param.
        /// </summary>
        [Fact]
        public async void GetInstancesForOrg()
        {
            await storageClient.PostInstances(testAppId, testInstanceOwnerId);
            await storageClient.PostInstances(testAppId, testInstanceOwnerId);

            string url = $"{versionPrefix}/instances?org={testOrg}";
            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string json = await response.Content.ReadAsStringAsync();
            List<Instance> instances = JsonConvert.DeserializeObject<List<Instance>>(json);

            Assert.Equal(2, instances.Count);
        }

        /// <summary>
        ///  Checks that multiple instances can be returned with query param.
        /// </summary>
        [Fact]
        public async void GetInstancesWithContinuationTokenAndHAL()
        {
            Instance instance1 = await storageClient.PostInstances(testAppId, testInstanceOwnerId);
            Instance instance2 = await storageClient.PostInstances(testAppId, testInstanceOwnerId);

            string url = $"{versionPrefix}/instances?appId={testAppId}&size=1";

            client.DefaultRequestHeaders.Add("Accept", "application/hal+json");

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string contentType = response.Content.Headers.ContentType.ToString();

            Assert.Contains("application/hal+json", contentType);

            string jsonString = await response.Content.ReadAsStringAsync();
            JObject jsonObject = JObject.Parse(jsonString);
            var result = jsonObject["_embedded"]["instances"];

            List<Instance> instances = result.ToObject<List<Instance>>();
            Assert.Single(instances);

            var nextUrl = jsonObject["_links"]["next"]["href"].ToString();

            HttpResponseMessage response2 = await client.GetAsync(nextUrl);
            response2.EnsureSuccessStatusCode();

            string jsonString2 = await response2.Content.ReadAsStringAsync();
            JObject jsonObject2 = JObject.Parse(jsonString2);

            var result2 = jsonObject2["_embedded"]["instances"];
            List<Instance> instances2 = result2.ToObject<List<Instance>>();
            Assert.Single(instances2);          

            var nextUrl2 = jsonObject2["_links"]["next"];
            Assert.Null(nextUrl2);
        }

        private Application CreateTestApplication(string testAppId)
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

        /// <summary>
        /// create two instances and check if they can be fetched for a given application owner.
        /// </summary>
        [Fact]
        public async void QueryInstancesOnApplicationOwnerId()
        {
            Instance i1 = await storageClient.PostInstances(testAppId, testInstanceOwnerId);
            Instance i2 = await storageClient.PostInstances(testAppId, testInstanceOwnerId);

            string requestUri = $"{versionPrefix}/instances?org={testOrg}";            

            HttpResponseMessage response = await client.GetAsync(requestUri);

            response.EnsureSuccessStatusCode();

            string json = await response.Content.ReadAsStringAsync();
            List<Instance> instances = JsonConvert.DeserializeObject<List<Instance>>(json);

            Assert.Equal(2, instances.Count);            
        }

        /// <summary>
        ///  Checks that multiple instances can be returned with org query param.
        /// </summary>
        [Fact]
        public async void GetInstancesAsJson()
        {
            Instance instance1 = await storageClient.PostInstances(testAppId, testInstanceOwnerId);
            Instance instance2 = await storageClient.PostInstances(testAppId, testInstanceOwnerId);

            string url = $"{versionPrefix}/instances?appId={testAppId}";

            client.DefaultRequestHeaders.Add("Accept", "application/json");

            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            string contentType = response.Content.Headers.ContentType.ToString();

            Assert.Contains("application/json", contentType);

            string jsonString = await response.Content.ReadAsStringAsync();

            Assert.True(true);
        }
    }
}
