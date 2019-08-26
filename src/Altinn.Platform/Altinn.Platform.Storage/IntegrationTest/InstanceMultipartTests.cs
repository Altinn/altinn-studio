using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
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
    /// Tests dataservice REST api with MultipartFormDataContent.
    /// </summary>
    public class InstanceMultipartTests : IClassFixture<PlatformStorageFixture>, IDisposable
    {
        private readonly PlatformStorageFixture fixture;
        private readonly ApplicationClient applicationClient;
        private readonly HttpClient client;
        private InstanceClient storageClient;
        private readonly string testOrg = "testing";
        private string testAppId = "testing/golfer06";

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
            this.applicationClient = new ApplicationClient(client);

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
            Application testApplication = new Application()
            {
                Id = testAppId,
                VersionId = "1.2.0",
                Org = "testing",
                Title = new LanguageString
                {
                    { "nb", "test multipart instantiation" },
                },
                ValidFrom = new DateTime(2019, 07, 01),
                ValidTo = new DateTime(2020, 06, 30),
                ElementTypes = new List<ElementType>()
            };

            testApplication.ElementTypes.Add(new ElementType()
            {
                Id = "default",
                AllowedContentType = new List<string>()
                {
                    "text/xml", "application/xml"
                },
            });
            
            testApplication.ElementTypes.Add(new ElementType()
            {
                Id = "picture",
                AllowedContentType = new List<string>()
                {
                    "image/png", "image/jpg"
                }
            });
            
            Application app = new Application();

            try
            {
                app = applicationClient.GetApplication(testApplication.Id);

                if (app != null)
                {
                    app = applicationClient.UpdateApplication(testApplication);
                }
            }
            catch (Exception e)
            {
                app = applicationClient.CreateApplication(testApplication);
            }             
    
            return app;
        }

        private Application DeleteApplicationMetadata()
        {
            ApplicationClient appClient = new ApplicationClient(client);

            Application existingApp = appClient.DeleteApplication(testAppId);

            return existingApp;
        }

        /// <summary>
        /// Store a multipart file in one post operation
        /// </summary>
        [Fact]
        public async void StoreMultiPartFileInOnePostOperation()
        {
            Instance instance = new Instance()
            {
                InstanceOwnerId = "1000",
                AppId = testAppId,
                Labels = new List<string>()
                {
                    "Hei"
                },
                DueDateTime = DateTime.Parse("2019-10-01")
            };
            
            MultipartFormDataContent form = new MultipartFormDataContent();

            form.Add(instance.AsJson(), "instance");

            string xmlText = File.ReadAllText("data/example.xml", Encoding.UTF8);
            form.Add(new StringContent(xmlText, Encoding.UTF8, "application/xml"), "default");

            string xmlText2 = File.ReadAllText("data/xmlfile.xml", Encoding.UTF8);
            form.Add(new StringContent(xmlText2, Encoding.UTF8, "text/xml"), "default");

            FileStream image = new FileStream("data/cat.jpg", FileMode.Open);
            
            StreamContent content = new StreamContent(image);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpg");
            form.Add(content, "picture");            

            string requestUri = $"{versionPrefix}/instances?appId={instance.AppId}&instanceOwnerId={instance.InstanceOwnerId}";

            HttpResponseMessage response = await client.PostAsync(requestUri, form);
            
            response.EnsureSuccessStatusCode();

            string result = await response.Content.ReadAsStringAsync();

            Instance instanceResult = JsonConvert.DeserializeObject<Instance>(result);
            
            Assert.NotEmpty(instanceResult.Data);

            Assert.Equal(3, instanceResult.Data.Count);

            foreach (DataElement data in instanceResult.Data)
            {
                Assert.NotEmpty(data.StorageUrl);
            }

            Assert.Equal("default", instanceResult.Data[0].ElementType);
            Assert.Equal("default", instanceResult.Data[1].ElementType);
            Assert.Equal("picture", instanceResult.Data[2].ElementType);

            Assert.Equal("1000", instanceResult.InstanceOwnerId);
        }
        
        /// <summary>
        /// Store a Json file.
        /// </summary>
        [Fact]
        public async void StoreAJsonFile()
        {
            Instance instance = new Instance()
            {
                InstanceOwnerId = "1000",
                AppId = testAppId,
                Labels = new List<string>()
                {
                    "Hei"
                },
                DueDateTime = DateTime.Parse("2019-10-01")
            };

            string requestUri = $"{versionPrefix}/instances?appId={instance.AppId}&instanceOwnerId={instance.InstanceOwnerId}";

            HttpResponseMessage postResponse = await client.PostAsync(requestUri, instance.AsJson());

            postResponse.EnsureSuccessStatusCode();

            string result = await postResponse.Content.ReadAsStringAsync();

            Instance instanceResult = JsonConvert.DeserializeObject<Instance>(result);

            Assert.Empty(instanceResult.Data);
        }
    }
}
