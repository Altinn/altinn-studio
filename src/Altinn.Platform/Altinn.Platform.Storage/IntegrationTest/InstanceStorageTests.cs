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
using Azure.Storage;
using Azure.Storage.Blobs;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    ///  Tests data service REST api.
    /// </summary>
    [Collection("Sequential")]
    public class InstanceStorageTests : IClassFixture<PlatformStorageFixture>, IClassFixture<BlobStorageFixture>, IClassFixture<CosmosDBFixture>, IDisposable
    {
        private readonly PlatformStorageFixture _fixture;
        private readonly HttpClient _client;
        private readonly InstanceClient _instanceClient;
        private string instanceId;
        private readonly string testOrg = "tests";
        private readonly string testAppId = "tests/sailor";
        private readonly int testInstanceOwnerId = 500;
        private readonly string dataType = "default";
        private BlobServiceClient _blobClient;
        private BlobContainerClient _blobContainer;
        private bool blobSetup = false;
        private readonly string _validToken;
        private readonly string _validOrgToken;

        private readonly string versionPrefix = "/storage/api/v1";

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceStorageTests"/> class.
        /// </summary>
        /// <param name="fixture">the fixture object which talks to the SUT (System Under Test)</param>
        public InstanceStorageTests(PlatformStorageFixture fixture)
        {
            _fixture = fixture;
            _client = _fixture.Client;
            _instanceClient = new InstanceClient(_client);

            // connect to azure blob storage
            StorageSharedKeyCredential storageCredentials = new StorageSharedKeyCredential("devstoreaccount1", "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==");

            Uri storageUrl = new Uri("http://127.0.0.1:10000/devstoreaccount1");
            _blobClient = new BlobServiceClient(storageUrl, storageCredentials);
            _blobContainer = _blobClient.GetBlobContainerClient("servicedata");

            _validToken = PrincipalUtil.GetToken(1);
            _validOrgToken = PrincipalUtil.GetOrgToken(org: testOrg, scope: "altinn:instances.read");
            CreateTestApplication();
        }

        /// <summary>
        /// Make sure repository is cleaned after the tests is run.
        /// </summary>
        public void Dispose()
        {
            string requestUri = $"{versionPrefix}/instances?org={testOrg}";

            HttpResponseMessage response = _client.GetAsync(requestUri).Result;
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

                            _client.DeleteAsync(dataDeleteUrl);
                        }
                    }

                    string instanceUrl = $"{versionPrefix}/instances/{instance.Id}?hard=true";
                    _client.DeleteAsync(instanceUrl);
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
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            Instance instanceData = new Instance
            {
                AppId = testAppId,
                InstanceOwner = new InstanceOwner { PartyId = testInstanceOwnerId.ToString() },
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo
                    {
                        ElementId = "Task_1",
                        Name = "FormFilling",
                    }
                }
            };

            string url = $"{versionPrefix}/instances?appId={testAppId}";

            HttpResponseMessage postResponse = await _client.PostAsync(url, instanceData.AsJson());

            postResponse.EnsureSuccessStatusCode();
            string instanceJson = await postResponse.Content.ReadAsStringAsync();
            Instance createdInstance = JsonConvert.DeserializeObject<Instance>(instanceJson);

            instanceId = createdInstance.Id;
            Assert.NotNull(instanceId);

            HttpResponseMessage getResponse = await _client.GetAsync($"{versionPrefix}/instances/{instanceId}");

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
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            await _instanceClient.PostInstances(testAppId, testInstanceOwnerId);

            string url = $"{versionPrefix}/instances?org={testOrg}&appId={testAppId}&instanceOwner.partyId={testInstanceOwnerId}";
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validOrgToken);
            HttpResponseMessage response = await _client.GetAsync(url);

            response.EnsureSuccessStatusCode();
            Assert.Equal("application/json; charset=utf-8", response.Content.Headers.ContentType.ToString());
        }

        /// <summary>
        /// Store a json file.
        /// </summary>
        [Fact]
        public async void StoreAForm()
        {
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            object jsonContent = new
            {
                universe = 42,
                årsjul = 365,
                text = "Fem flotte åer er bedre en to ærlige øl!",
            };

            // create instance
            Instance newInstance = await _instanceClient.PostInstances(testAppId, testInstanceOwnerId);

            string requestUri = $"{versionPrefix}/instances/{newInstance.Id}/data?dataType={dataType}";

            // post the file
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
            HttpResponseMessage postResponse = await _client.PostAsync(requestUri, jsonContent.AsJson());

            postResponse.EnsureSuccessStatusCode();
        }

        /// <summary>
        /// Store a binary file.
        /// </summary>
        [Fact]
        public async void StoreABinaryFileAsAttachment()
        {
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;
            Instance instance = await _instanceClient.PostInstances(applicationId, instanceOwnerId);
            HttpResponseMessage response = await _instanceClient.PostFileAsAttachment(instance, "default", "binary_file.pdf", "application/pdf");

            response.EnsureSuccessStatusCode();
        }

        /// <summary>
        /// Store a binary file by stream.
        /// </summary>
        [Fact]
        public async void StoreABinaryFileByStream()
        {
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;
            Instance instance = await _instanceClient.PostInstances(applicationId, instanceOwnerId);
            HttpResponseMessage response = await _instanceClient.PostFileAsStream(instance, "default", "binary_file.pdf", "application/pdf");

            response.EnsureSuccessStatusCode();
        }

        /// <summary>
        /// Stores a file in multipart format.
        /// </summary>
        [Fact]
        public async void StoreABinaryFileAsMultipart()
        {
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            Instance instance = await _instanceClient.PostInstances(applicationId, instanceOwnerId);
            string requestUri = $"{versionPrefix}/instances/{instance.Id}/data?dataType={dataType}";

            Stream input = File.OpenRead("data/binary_file.pdf");

            HttpContent fileStreamContent = new StreamContent(input);

            using MultipartFormDataContent formData = new MultipartFormDataContent
            {
                { fileStreamContent, dataType, "binary_file.pdf" }
            };

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
            HttpResponseMessage response = await _client.PostAsync(requestUri, fileStreamContent);

            response.EnsureSuccessStatusCode();
        }

        private Application CreateTestApplication()
        {
            ApplicationClient appClient = new ApplicationClient(_client);

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
            ApplicationClient appClient = new ApplicationClient(_client);

            Application existingApp = appClient.DeleteApplication(testAppId);

            return existingApp;
        }

        /// <summary>
        /// Read a binary file 
        /// </summary>
        [Fact]
        public async void GetABinaryFileByStream()
        {
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            Instance instance = await _instanceClient.PostInstances(applicationId, instanceOwnerId);

            DataElement dataElement = await _instanceClient.PostFileAsAttachmentAndReturnMetadata(instance, "default", "binary_file.pdf", "application/pdf");

            string requestUri = $"{versionPrefix}/instances/{instance.Id}/data/{dataElement.Id}";
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
            using HttpResponseMessage response2 = await _client.GetAsync(requestUri, HttpCompletionOption.ResponseHeadersRead);

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
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            Instance instance = await _instanceClient.PostInstances(applicationId, instanceOwnerId);

            DataElement dataElement = await _instanceClient.PostFileAsAttachmentAndReturnMetadata(instance, "default", "image.png", "image/png");

            string requestUri = $"{versionPrefix}/instances/{instance.Id}/data/{dataElement.Id}";
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
            using HttpResponseMessage response = await _client.GetAsync(requestUri, HttpCompletionOption.ResponseHeadersRead);

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
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            Instance instance = await _instanceClient.PostInstances(applicationId, instanceOwnerId);

            DataElement dataElement = await _instanceClient.PostFileAsAttachmentAndReturnMetadata(instance, "default", "binary_file.pdf", "application/pdf");

            string requestUri = $"{versionPrefix}/instances/{instance.Id}/data/{dataElement.Id}";

            string dataFile = "image.png";

            using Stream input = File.OpenRead($"data/{dataFile}");

            HttpContent fileStreamContent = new StreamContent(input);

            using MultipartFormDataContent dataContent = new MultipartFormDataContent
            {
                { fileStreamContent, dataType, dataFile }
            };
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
            HttpResponseMessage response = await _client.PutAsync(requestUri, fileStreamContent);

            response.EnsureSuccessStatusCode();
        }

        /// <summary>
        ///  update an existing data file.
        /// </summary>
        [Fact]
        public async void UpdateDataFile_SetFileName()
        {
            if (!blobSetup)
            {
                await EnsureValidStorage();
            }

            string applicationId = testAppId;
            int instanceOwnerId = testInstanceOwnerId;

            Instance instance = await _instanceClient.PostInstances(applicationId, instanceOwnerId);

            DataElement dataElement = await _instanceClient.PostFileAsAttachmentAndReturnMetadata(instance, "default", "binary_file.pdf", "application/pdf");

            string requestUri = $"{versionPrefix}/instances/{instance.Id}/data/{dataElement.Id}";

            string dataFile = "image.png";

            using Stream input = File.OpenRead($"data/{dataFile}");

            HttpContent fileStreamContent = new StreamContent(input);
            string contentType = "application/xml";
            string fileName = "Testfile.xml";

            fileStreamContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
            fileStreamContent.Headers.ContentDisposition = ContentDispositionHeaderValue.Parse("form-data; name=" + Path.GetFileNameWithoutExtension(fileName));
            fileStreamContent.Headers.ContentDisposition.FileName = fileName;

            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _validToken);
            HttpResponseMessage response = await _client.PutAsync(requestUri, fileStreamContent).ConfigureAwait(false);

            response.EnsureSuccessStatusCode();

            DataElement dataElement2 = JsonConvert.DeserializeObject<DataElement>(await response.Content.ReadAsStringAsync());

            Assert.Equal("Testfile.xml", dataElement2.Filename);
        }

        private async Task EnsureValidStorage()
        {
            await _blobContainer.CreateIfNotExistsAsync();
            blobSetup = true;
        }
    }
}
