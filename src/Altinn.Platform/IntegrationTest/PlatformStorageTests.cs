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
            DateTime creationTimestamp = DateTime.Now;

            Instance instanceData = new Instance
            {
                ReporteeId = "666",
                ServiceId = "sailor",
                CreatedDateTime = creationTimestamp,
            };

            HttpResponseMessage postResponse = await client.PostAsync("/dataservice/reportees/666/instances", instanceData.AsJson());

            postResponse.EnsureSuccessStatusCode();
            string newId = await postResponse.Content.ReadAsStringAsync();

            Assert.NotNull(newId);

            HttpResponseMessage getResponse = await client.GetAsync("/dataservice/reportees/666/instances/" + newId);

            getResponse.EnsureSuccessStatusCode();
            Instance actual = await getResponse.Content.ReadAsAsync<Instance>();

            Assert.Equal(newId, actual.Id);
            Assert.Equal("666", actual.ReporteeId);
            Assert.Equal("sailor", actual.ServiceId);
            Assert.Equal(creationTimestamp, actual.CreatedDateTime);
        }

        /// <summary>
        ///  Checks that the Inline data urls returns a proper encoding.
        /// </summary>
        /// <param name="url">the url to check</param>
        [Theory]
        [InlineData("/dataservice/reportees/666/instances")]
        public async void GetInstancesForReportee(string url)
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
            formData.FormDataXml = "<message>42</message>";

            string url = string.Format("dataservice/instances/{0}/forms", "guid123");

            HttpResponseMessage postResponse = await client.PostAsync(url, formData.AsJson());

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
