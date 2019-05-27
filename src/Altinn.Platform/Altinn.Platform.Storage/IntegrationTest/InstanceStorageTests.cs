using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;
using Storage.Interface.Clients;
using Storage.Interface.Models;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    ///  Tests dataservice REST api.
    /// </summary>
    public class InstanceStorageTests : IClassFixture<PlatformStorageFixture>, IDisposable
    {
        private readonly PlatformStorageFixture fixture;
        private readonly HttpClient client;
        private InstanceClient storageClient;
        private string instanceId;
        private readonly string testApplicationOwnerId = "tests";
        private string testAppId = "tests/sailor";
        private readonly int testInstanceOwnerId = 500;
        private readonly string elementType = "default";

        private readonly string versionPrefix = "/storage/api/v1";

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceStorageTests"/> class.
        /// </summary>
        /// <param name="fixture">the fixture object which talks to the SUT (System Under Test)</param>
        public InstanceStorageTests(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.client = this.fixture.Client;
            this.storageClient = new InstanceClient(this.client);

            CreateTestApplicationMetadata();
        }

        /// <summary>
        /// Make sure repository is cleaned after the tests is run.
        /// </summary>
        public void Dispose()
        {
            string requestUri = $"{versionPrefix}/instances?applicationOwnerId={testApplicationOwnerId}";            

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
                            string dataUrl = "/data/" + element.Id + "?instanceOwnerId=" + testInstanceOwnerId;

                            string dataDeleteUrl = url + dataUrl;

                            client.DeleteAsync(dataDeleteUrl);
                        }
                    }

                    string instanceUrl = $"{versionPrefix}/instances/{instance.Id}?instanceOwnerId={instance.InstanceOwnerId}&hard=true";
                    client.DeleteAsync(instanceUrl);
                }
            }

            DeleteApplicationMetadata();
        }

        /// <summary>
        /// Creates an instance of a service and asks then asks the service to get the instance. Checks if returned object has
        /// same values as object which was sent in.
        /// </summary>
        [Fact]
        public async void CreateInstanceReturnsNewIdAndNextGetReturnsSameId()
        {           
            Instance instanceData = new Instance
            {
                AppId = testAppId,
            };

            string url = $"{versionPrefix}/instances?instanceOwnerId={testInstanceOwnerId}&applicationId={testAppId}";            

            HttpResponseMessage postResponse = await client.PostAsync(url, instanceData.AsJson());

            postResponse.EnsureSuccessStatusCode();
            string newId = await postResponse.Content.ReadAsStringAsync();
            instanceId = newId;
            Assert.NotNull(newId);

            HttpResponseMessage getResponse = await client.GetAsync($"{versionPrefix}/instances/{newId}?instanceOwnerId={testInstanceOwnerId}");

            getResponse.EnsureSuccessStatusCode();

            string json = await getResponse.Content.ReadAsStringAsync();
            Instance actual = JsonConvert.DeserializeObject<Instance>(json);

            Assert.Equal(newId, actual.Id);

            Assert.Equal(testInstanceOwnerId.ToString(), actual.InstanceOwnerId);
            Assert.Equal(testAppId, actual.AppId);
        }

        /// <summary>
        ///  Checks that the Inline data urls returns a proper encoding.
        /// </summary>
        [Fact]
        public async void GetInstancesForInstanceOwner()
        {
            await storageClient.PostInstances(testAppId, testInstanceOwnerId);

            string url = $"{versionPrefix}/instances?instanceOwnerId={testInstanceOwnerId}";
            HttpResponseMessage response = await client.GetAsync(url);

            response.EnsureSuccessStatusCode();
            Assert.Equal("application/json; charset=utf-8", response.Content.Headers.ContentType.ToString());
        }

        /// <summary>
        /// Store a json file.
        /// </summary>
        [Fact]
        public async void StoreAForm()
        {
            object jsonContent = new
            {
                universe = 42,
                årsjul = 365,
                text = "Fem flotte åer er bedre en to ærlige øl!",
            };

            // create instance
            string newId = await storageClient.PostInstances(testAppId, testInstanceOwnerId);
            Instance instance = await storageClient.GetInstances(newId, testInstanceOwnerId);

            string requestUri = $"{versionPrefix}/instances/{newId}/data?elementType={elementType}&instanceOwnerId={testInstanceOwnerId}";

            // post the file
            HttpResponseMessage postResponse = await client.PostAsync(requestUri, jsonContent.AsJson());

            postResponse.EnsureSuccessStatusCode();
        }

        /// <summary>
        /// Store a binary file.
        /// </summary>
        [Fact]
        public async void StoreABinaryFile()
        {
            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            string instanceId = await storageClient.PostInstances(applicationId, instanceOwnerId);
            string requestUri = $"{versionPrefix}/instances/{instanceId}/data?elementType={elementType}&instanceOwnerId={instanceOwnerId}";
            
            using (Stream input = File.OpenRead("data/binary_file.pdf"))
            {
                HttpContent fileStreamContent = new StreamContent(input);

                using (MultipartFormDataContent formData = new MultipartFormDataContent())
                {
                    formData.Add(fileStreamContent, elementType, "binary_file.pdf");
                    HttpResponseMessage response = await client.PostAsync(requestUri, formData);

                    response.EnsureSuccessStatusCode();
                }
            }
        }

        private Application CreateTestApplicationMetadata()
        {
            ApplicationMetadataClient appClient = new ApplicationMetadataClient(client);

            try
            {
                Application existingApp = appClient.GetApplicationMetadata(testAppId);
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
            ApplicationMetadataClient appClient = new ApplicationMetadataClient(client);

            Application existingApp = appClient.DeleteApplicationMetadata(testAppId);

            return existingApp;
        }

        /// <summary>
        /// Read a binary file.
        /// </summary>
        [Fact]
        public async void GetABinaryFile()
        {
            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            string instanceId = await storageClient.PostInstances(applicationId, instanceOwnerId);
            Instance instance = await storageClient.GetInstances(instanceId, instanceOwnerId);

            await storageClient.PostDataReadFromFile(instanceId, instanceOwnerId, "binary_file.pdf", "application/pdf");
            instance = await storageClient.GetInstances(instanceId, instanceOwnerId);

            string dataId = instance.Data.Find(m => m.ElementType.Equals("default")).Id;

            string requestUri = $"{versionPrefix}/instances/{instanceId}/data/{dataId}?instanceOwnerId={instanceOwnerId}";
            
            using (HttpResponseMessage response = await client.GetAsync(requestUri, HttpCompletionOption.ResponseHeadersRead))
            {
                if (response.IsSuccessStatusCode)
                {
                    using (Stream remoteStream = await response.Content.ReadAsStreamAsync())
                    using (var output = File.Create("test.pdf"))
                    {
                        await remoteStream.CopyToAsync(output);
                    }
                }
            }
        }

        /// <summary>
        ///  update an existing data file.
        /// </summary>
        [Fact]
        public async void UpdateDataFile()
        {
            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            string instanceId = await storageClient.PostInstances(applicationId, instanceOwnerId);
            Instance instance = await storageClient.GetInstances(instanceId, instanceOwnerId);

            await storageClient.PostDataReadFromFile(instanceId, instanceOwnerId, "binary_file.pdf", "application/pdf");

            instance = await storageClient.GetInstances(instanceId, instanceOwnerId);

            string dataId = instance.Data.Find(m => m.ElementType.Equals("default")).Id;

            string requestUri = $"{versionPrefix}/instances/{instanceId}/data/{dataId}?instanceOwnerId={instanceOwnerId}";
            
            string dataFile = "image.png";

            using (Stream input = File.OpenRead($"data/{dataFile}"))
            {
                HttpContent fileStreamContent = new StreamContent(input);

                using (MultipartFormDataContent formData = new MultipartFormDataContent())
                {
                    formData.Add(fileStreamContent, elementType, dataFile);
                    HttpResponseMessage response = client.PutAsync(requestUri, formData).Result;

                    response.EnsureSuccessStatusCode();
                }
            }
        }

        /// <summary>
        /// create two instances and check if they can be fetched for a given application owner.
        /// </summary>
        [Fact]
        public async void QueryInstancesOnApplicationOwnerId()
        {
            string i1 = await storageClient.PostInstances(testAppId, testInstanceOwnerId);
            string i2 = await storageClient.PostInstances(testAppId, testInstanceOwnerId);

            string requestUri = $"{versionPrefix}/instances?applicationOwnerId={testApplicationOwnerId}";            

            HttpResponseMessage response = await client.GetAsync(requestUri);

            response.EnsureSuccessStatusCode();

            string json = await response.Content.ReadAsStringAsync();
            List<Instance> instances = JsonConvert.DeserializeObject<List<Instance>>(json);

            Assert.Equal(2, instances.Count);            
        }
    }
}
