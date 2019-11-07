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
    public class InstanceStorageTests : IClassFixture<PlatformStorageFixture>, IDisposable
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
        public InstanceStorageTests(PlatformStorageFixture fixture)
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
        /// Creates an instance of an app and then asks the app to get the instance. Checks if returned object has
        /// same values as object which was sent in.
        /// </summary>
        [Fact]
        public async void CreateInstanceReturnsNewIdAndNextGetReturnsSameId()
        {
            Instance instanceData = new Instance
            {
                AppId = testAppId,
                InstanceOwner = new InstanceOwner { PartyId = testInstanceOwnerId.ToString() },
            };

            string url = $"{versionPrefix}/instances?appId={testAppId}";

            HttpResponseMessage postResponse = await client.PostAsync(url, instanceData.AsJson());

            postResponse.EnsureSuccessStatusCode();
            string instanceJson = await postResponse.Content.ReadAsStringAsync();
            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(instanceJson);

            instanceId = createdInstance.Id;
            Assert.NotNull(instanceId);

            HttpResponseMessage getResponse = await client.GetAsync($"{versionPrefix}/instances/{instanceId}");

            getResponse.EnsureSuccessStatusCode();

            string json = await getResponse.Content.ReadAsStringAsync();
            Instance actual = JsonConvert.DeserializeObject<Instance>(json);

            Assert.Equal(createdInstance.Id, actual.Id);

            Assert.Equal(testInstanceOwnerId.ToString(), actual.InstanceOwner.PartyId);
            Assert.Equal(testAppId, actual.AppId);
        }

        /// <summary>
        ///  Checks that the GET returns a proper encoding.
        /// </summary>
        [Fact]
        public async void GetInstancesAndCheckEncoding()
        {
            await storageClient.PostInstances(testAppId, testInstanceOwnerId);

            string url = $"{versionPrefix}/instances/{testInstanceOwnerId}";
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
            Instance newInstance = await storageClient.PostInstances(testAppId, testInstanceOwnerId);

            string requestUri = $"{versionPrefix}/instances/{newInstance.Id}/data?dataType={dataType}";

            // post the file
            HttpResponseMessage postResponse = await client.PostAsync(requestUri, jsonContent.AsJson());

            postResponse.EnsureSuccessStatusCode();
        }

        /// <summary>
        /// Store a binary file.
        /// </summary>
        [Fact]
        public async void StoreABinaryFileAsAttachment()
        {
            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;
            Instance instance = await storageClient.PostInstances(applicationId, instanceOwnerId);
            HttpResponseMessage response = await storageClient.PostFileAsAttachment(instance, "default", "binary_file.pdf", "application/pdf");

            response.EnsureSuccessStatusCode();
        }

        /// <summary>
        /// Store a binary file by stream.
        /// </summary>
        [Fact]
        public async void StoreABinaryFileByStream()
        {
            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;
            Instance instance = await storageClient.PostInstances(applicationId, instanceOwnerId);
            HttpResponseMessage response = await storageClient.PostFileAsStream(instance, "default", "binary_file.pdf", "application/pdf");

            response.EnsureSuccessStatusCode();
        }

        /// <summary>
        /// Stores a file in multipart format.
        /// </summary>
        [Fact]
        public async void StoreABinaryFileAsMultipart()
        {
            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            Instance instance = await storageClient.PostInstances(applicationId, instanceOwnerId);
            string requestUri = $"{versionPrefix}/instances/{instance.Id}/data?dataType={dataType}";

            Stream input = File.OpenRead("data/binary_file.pdf");

            HttpContent fileStreamContent = new StreamContent(input);

            using MultipartFormDataContent formData = new MultipartFormDataContent
            {
                { fileStreamContent, dataType, "binary_file.pdf" }
            };

            HttpResponseMessage response = await client.PostAsync(requestUri, fileStreamContent);

            response.EnsureSuccessStatusCode();
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

        /// <summary>
        /// Read a binary file 
        /// </summary>
        [Fact]
        public async void GetABinaryFileByStream()
        {
            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            Instance instance = await storageClient.PostInstances(applicationId, instanceOwnerId);

            DataElement dataElement = await storageClient.PostFileAsAttachmentAndReturnMetadata(instance, "default", "binary_file.pdf", "application/pdf");
                 
            string requestUri = $"{versionPrefix}/instances/{instance.Id}/data/{dataElement.Id}";

            using HttpResponseMessage response2 = await client.GetAsync(requestUri, HttpCompletionOption.ResponseHeadersRead);
            
            if (response2.IsSuccessStatusCode)
            {
                using Stream remoteStream = await response2.Content.ReadAsStreamAsync();
                using var output = File.Create("test.pdf");
                
                await remoteStream.CopyToAsync(output);                
            }

            Assert.True(File.Exists("test.pdf"));
        }

        /// <summary>
        /// Read a binary file.
        /// </summary>
        [Fact]
        public async void StoreAndGetImageFile()
        {
            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            Instance instance = await storageClient.PostInstances(applicationId, instanceOwnerId);

            DataElement dataElement = await storageClient.PostFileAsAttachmentAndReturnMetadata(instance, "default", "image.png", "image/png");
            
            string requestUri = $"{versionPrefix}/instances/{instance.Id}/data/{dataElement.Id}";

            using HttpResponseMessage response = await client.GetAsync(requestUri, HttpCompletionOption.ResponseHeadersRead);
            
            if (response.IsSuccessStatusCode)
            {
                using Stream remoteStream = await response.Content.ReadAsStreamAsync();
                using FileStream output = File.Create("test.png");                

                await remoteStream.CopyToAsync(output);                             
            }

            Assert.True(File.Exists("test.png"));
        }

        /// <summary>
        ///  update an existing data file.
        /// </summary>
        [Fact]
        public async void UpdateDataFile()
        {
            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            Instance instance = await storageClient.PostInstances(applicationId, instanceOwnerId);
            
            DataElement dataElement = await storageClient.PostFileAsAttachmentAndReturnMetadata(instance, "default", "binary_file.pdf", "application/pdf");           

            string requestUri = $"{versionPrefix}/instances/{instance.Id}/data/{dataElement.Id}";
            
            string dataFile = "image.png";

            using Stream input = File.OpenRead($"data/{dataFile}");
          
            HttpContent fileStreamContent = new StreamContent(input);

            using MultipartFormDataContent dataContent = new MultipartFormDataContent
            {
                { fileStreamContent, dataType, dataFile }
            };

            HttpResponseMessage response = await client.PutAsync(requestUri, fileStreamContent);

            response.EnsureSuccessStatusCode();            
        }

        /// <summary>
        ///  update an existing data file.
        /// </summary>
        [Fact]
        public async void UpdateDataFile_SetFileName()
        {
            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            Instance instance = await storageClient.PostInstances(applicationId, instanceOwnerId);

            DataElement dataElement = await storageClient.PostFileAsAttachmentAndReturnMetadata(instance, "default", "binary_file.pdf", "application/pdf");

            string requestUri = $"{versionPrefix}/instances/{instance.Id}/data/{dataElement.Id}";

            string dataFile = "image.png";

            using Stream input = File.OpenRead($"data/{dataFile}");
            
            HttpContent fileStreamContent = new StreamContent(input);
            string contentType = "application/xml";
            string fileName = "Testfile.xml";

            fileStreamContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
            fileStreamContent.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("form-data; name=" + Path.GetFileNameWithoutExtension(fileName));
            fileStreamContent.Headers.ContentDisposition.FileName = fileName;

            HttpResponseMessage response = await client.PutAsync(requestUri, fileStreamContent).ConfigureAwait(false);

            response.EnsureSuccessStatusCode();

            DataElement dataElement2 = JsonConvert.DeserializeObject<DataElement>(await response.Content.ReadAsStringAsync());         

            Assert.Equal("Testfile.xml", dataElement2.Filename);            
        }
    }
}
