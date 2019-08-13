using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
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
    /// Tests dataservice REST api with MultipartFormDataContent.
    /// </summary>
    public class InstanceMultipartTests : IClassFixture<PlatformStorageFixture>, IDisposable
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
        public InstanceMultipartTests(PlatformStorageFixture fixture)
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
        /// Store a multipart file in one post operation (metadata in cosmos and file in storage)
        /// </summary>
        [Fact]
        public async void StoreMultiPartFileInOnePostOperation()
        {
            Instance instance = new Instance()
            {
                InstanceOwnerId = "1000",
                AppId = "tests/sailor",
                Labels = new List<string>()
                {
                    "Hei"
                },
                DueDateTime = DateTime.Parse("2019-10-01")
            };

            MultipartFormDataContent form = new MultipartFormDataContent();

            form.Add(instance.AsJson(), "instance");
            string xmlText = File.ReadAllText("data/example.xml");

            form.Add(new StringContent(xmlText, Encoding.UTF8, "application/xml"), "default");
        
            string requestUri = $"{versionPrefix}/instances?appId={instance.AppId}&instanceOwnerId={instance.InstanceOwnerId}";

            HttpResponseMessage response = await client.PostAsync(requestUri, form);
            
            response.EnsureSuccessStatusCode();

            string result = await response.Content.ReadAsStringAsync();

            Instance instanceResult = JsonConvert.DeserializeObject<Instance>(result);

            // Assert
            Assert.Equal("1000", instanceResult.InstanceOwnerId);
        }
    }
}
