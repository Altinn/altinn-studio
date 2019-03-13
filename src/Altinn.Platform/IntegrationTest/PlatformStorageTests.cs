using System;
using System.Net.Http;
using System.Text;
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

        /// <summary>
        /// Creates an instance of a service and asks then asks the service to get the instance. Checks if returned object has
        /// same values as object which was sent in.
        /// </summary>
        [Fact]
        public async void CreateInstanceReturnsNewIdAndNextGetReturnsSameId()
        {

            Instance instanceData = new Instance
            {
                InstanceOwnerId = "666",
                ApplicationId = "sailor",
                ApplicationOwnerId = "BRREG",
            };

            HttpResponseMessage postResponse = await client.PostAsync("/api/v1/instances?instanceOwnerId=666", instanceData.AsJson());

            postResponse.EnsureSuccessStatusCode();
            string newId = await postResponse.Content.ReadAsStringAsync();
            instanceId = newId;
            Assert.NotNull(newId);

            HttpResponseMessage getResponse = await client.GetAsync("/api/v1/instances/" + newId + "/?instanceOwnerId=666");

            getResponse.EnsureSuccessStatusCode();
            Instance actual = await getResponse.Content.ReadAsAsync<Instance>();

            Assert.Equal(newId, actual.Id);
            Assert.Equal("666", actual.InstanceOwnerId);
            Assert.Equal("sailor", actual.ApplicationId);
        }

        /// <summary>
        ///  Checks that the Inline data urls returns a proper encoding.
        /// </summary>
        /// <param name="url">the url to check</param>
        [Theory]
        [InlineData("/api/v1/instances?instanceOwnerId=666")]
        public async void GetInstancesForReportee(string url)
        {
            HttpResponseMessage response = await client.GetAsync(url);

            response.EnsureSuccessStatusCode();
            Assert.Equal("application/json; charset=utf-8", response.Content.Headers.ContentType.ToString());
        }

        /// <summary>
        ///  Checks that the Inline data urls returns a proper encoding.
        /// </summary>
        /// <param name="url">the url to check</param>
        [Theory]
        [InlineData("/api/v1/instances/" + instanceId)]
        public async void UpdateInstancesForReportee(string url)
        {
            HttpResponseMessage response = await client.GetAsync(url);

            response.EnsureSuccessStatusCode();
            Assert.Equal("application/json; charset=utf-8", response.Content.Headers.ContentType.ToString());
        }

        [Fact]
        public async void StoreAForm()
        {
            Data formData = new Data();
            formData.FileName = "u2.json";
            string fileContent = "{ universe: 42 }";

            string url = string.Format("api/v1/instances/{0}/data/boatdata", "fgab-3xy123-xxx");

            HttpResponseMessage postResponse = await client.PostAsync(url, fileContent.AsJson());

            postResponse.EnsureSuccessStatusCode();
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
