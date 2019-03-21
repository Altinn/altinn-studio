using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Test.Integration.Fixtures;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Test.Integration
{
    /// <summary>
    ///  Tests dataservice REST api.
    /// </summary>
    public class PlatformStorageTests : IClassFixture<PlatformStorageFixture>
    {
        private readonly PlatformStorageFixture fixture;
        private readonly HttpClient client;
        public string instanceId;

        /// <summary>
        /// Initializes a new instance of the <see cref="PlatformStorageTests"/> class.
        /// </summary>
        /// <param name="fixture">the fixture object which talks to the SUT (System Under Test)</param>
        public PlatformStorageTests(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.client = this.fixture.Client;
        }

        private void SetUser(int id)
        {
            string userdata = string.Format("{0}:password", id);
            var byteArray = Encoding.UTF8.GetBytes(userdata);
            this.client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
                "Basic",
                Convert.ToBase64String(byteArray));
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
                ApplicationId = "KNS/sailor",
                ApplicationOwnerId = "BRREG",
            };

            HttpResponseMessage postResponse = await client.PostAsync("/api/v1/instances?instanceOwnerId=666&applicationId=KNS/sailor", instanceData.AsJson());

            postResponse.EnsureSuccessStatusCode();
            string newId = await postResponse.Content.ReadAsStringAsync();
            instanceId = newId;
            Assert.NotNull(newId);

            HttpResponseMessage getResponse = await client.GetAsync("/api/v1/instances/" + newId + "?instanceOwnerId=666");

            getResponse.EnsureSuccessStatusCode();
            Instance actual = await getResponse.Content.ReadAsAsync<Instance>();

            Assert.Equal(newId, actual.Id);
            //Assert.Equal("666", actual.InstanceOwnerId);
            Assert.Equal("KNS/sailor", actual.ApplicationId);
        }

        /// <summary>
        ///  Checks that the Inline data urls returns a proper encoding.
        /// </summary>
        /// <param name="url">the url to check</param>
        [Theory]
        [InlineData("/api/v1/instances/query?instanceOwnerId=666")]
        public async void GetInstancesForInstanceOwner(string url)
        {
            HttpResponseMessage response = await client.GetAsync(url);

            response.EnsureSuccessStatusCode();
            Assert.Equal("application/json; charset=utf-8", response.Content.Headers.ContentType.ToString());
        }


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
            string newId = await CreateInstance("KNS/sailor", 642);
            Instance instance = await GetInstance(newId, 642);

            string url = string.Format("api/v1/instances/{0}/data/boatdata?instanceOwnerId={1}", newId, 642);

            // post the file
            HttpResponseMessage postResponse = await client.PostAsync(url, jsonContent.AsJson());

            postResponse.EnsureSuccessStatusCode();
        }

        [Fact]
        public async void StoreABinaryFile()
        {
            string applicationId = "KNS/sailor";
            int instanceOwnerId = 641;

            string instanceId = await CreateInstance(applicationId, instanceOwnerId);
            string urlTemplate = "api/v1/instances/{0}/data/crewlist?instanceOwnerId={1}";
            string requestUri = string.Format(urlTemplate, instanceId, instanceOwnerId);

            using (Stream input = File.OpenRead("data/binary_file.pdf"))
            {
                HttpContent fileStreamContent = new StreamContent(input);

                using (MultipartFormDataContent formData = new MultipartFormDataContent())
                {
                    formData.Add(fileStreamContent, "crewlist", "binary_file.pdf");
                    HttpResponseMessage response = client.PostAsync(requestUri, formData).Result;

                    response.EnsureSuccessStatusCode();
                }
            }
        }

        [Fact]
        public async void GetABinaryFile()
        {
            string applicationId = "KNS/sailor";
            int instanceOwnerId = 642;

            string instanceId = await CreateInstance(applicationId, instanceOwnerId);
            Instance instance = await GetInstance(instanceId, instanceOwnerId);

            UploadBinaryFile(instanceId, instanceOwnerId, "binary_file.pdf", "application/pdf");
            instance = await GetInstance(instanceId, instanceOwnerId);

            string dataId = instance.Data["crewlist"].Keys.First();

            string urlTemplate = "api/v1/instances/{0}/data/crewlist/{1}?instanceOwnerId={2}";
            string requestUri = string.Format(urlTemplate, instanceId, dataId, instanceOwnerId);

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

        [Fact]
        public async void UpdateDataFile()
        {
            string applicationId = "KNS/sailor";
            int instanceOwnerId = 642;

            string instanceId = await CreateInstance(applicationId, instanceOwnerId);
            Instance instance = await GetInstance(instanceId, instanceOwnerId);

            UploadBinaryFile(instanceId, instanceOwnerId, "binary_file.pdf", "application/pdf");

            instance = await GetInstance(instanceId, instanceOwnerId);

            string dataId = instance.Data["crewlist"].Keys.First();

            string urlTemplate = "api/v1/instances/{0}/data/crewlist/{1}?instanceOwnerId={2}";
            string requestUri = string.Format(urlTemplate, instanceId, dataId, instanceOwnerId);

            string dataFile = "image.png";

            using (Stream input = File.OpenRead($"data/{dataFile}"))
            {
                HttpContent fileStreamContent = new StreamContent(input);

                using (MultipartFormDataContent formData = new MultipartFormDataContent())
                {
                    formData.Add(fileStreamContent, "crewlist", dataFile);
                    HttpResponseMessage response = client.PutAsync(requestUri, formData).Result;

                    response.EnsureSuccessStatusCode();
                }
            }
        }

        [Fact]
        public async void queryInstancesOnApplicationOwnerId()
        {
            string urlTemplate = "api/v1/instances/query?applicationOwnerId={0}";
            string requestUri = string.Format(urlTemplate, "KNS");

            HttpResponseMessage response = await client.GetAsync(requestUri);

            response.EnsureSuccessStatusCode();
        }

        private async void UploadBinaryFile(string instanceId, int instanceOwnerId, string fileName, string contentType)
        {
            string urlTemplate = "api/v1/instances/{0}/data/crewlist?instanceOwnerId={1}";
            string requestUri = string.Format(urlTemplate, instanceId, instanceOwnerId);

            using (Stream input = File.OpenRead($"data/{fileName}"))
            {
                HttpContent fileStreamContent = new StreamContent(input);

                using (MultipartFormDataContent formData = new MultipartFormDataContent())
                {
                    formData.Add(fileStreamContent, "crewlist", fileName);

                    HttpResponseMessage response = client.PostAsync(requestUri, formData).Result;

                    response.EnsureSuccessStatusCode();
                }
            }
        }

        private async Task<Instance> GetInstance(string instanceId, int instanceOwnerId)
        {
            string urlTemplate = "api/v1/instances/{0}/?instanceOwnerId={1}";
            string url = string.Format(urlTemplate, instanceId, instanceOwnerId);

            HttpResponseMessage getInstanceResponse = await client.GetAsync(url);
            Instance instance = await getInstanceResponse.Content.ReadAsAsync<Instance>();

            return instance;
        }

        private async Task<string> CreateInstance(string applicationId, int instanceOwnerId)
        {
            string urlTemplate = "api/v1/instances?applicationId={0}&instanceOwnerId={1}";
            string url = string.Format(urlTemplate, applicationId, instanceOwnerId);

            HttpResponseMessage createInstanceResponse = await client.PostAsync(url, string.Empty.AsJson());
            string newId = await createInstanceResponse.Content.ReadAsStringAsync();

            return newId;
        }
    }

    /// <summary>
    /// Class to wrap a json object into a StringContent with correct encoding and content type.
    /// </summary>
    public static class Extensions
    {
        /// <summary>
        ///  Wrapper method.
        /// </summary>
        /// <param name="o">the json object to wrap.</param>
        /// <returns>a StringContent object.</returns>
        public static StringContent AsJson(this object o)
        => new StringContent(JsonConvert.SerializeObject(o), Encoding.UTF8, "application/json");
    }
}
