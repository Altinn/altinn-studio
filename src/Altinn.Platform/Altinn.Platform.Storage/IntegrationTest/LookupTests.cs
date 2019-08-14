using System;
using System.Net.Http;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;
using Storage.Interface.Clients;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    /// Tests to se if integration with Bridge works.
    /// </summary>
    public class LookupTests : IClassFixture<PlatformStorageFixture>
    {
        private readonly PlatformStorageFixture fixture;
        private readonly HttpClient client;
        private readonly InstanceClient storageClient;
        private readonly string versionPrefix = "/storage/api/v1";

        /// <summary>
        /// Lookup tests
        /// </summary>
        /// <param name="fixture">the fixture to simulate system under test</param>
        public LookupTests(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.client = this.fixture.Client;
            this.storageClient = new InstanceClient(this.client);
        }

        /// <summary>
        /// Check instance owner lookup.
        /// </summary>
        [Fact]
        public async void InstanceOwnerLookup()
        {
            string applicationId = "test/lookup";

            CreateTestApplication(applicationId);

            Instance instanceData = new Instance
            {
                AppId = applicationId,
                InstanceOwnerLookup = new InstanceOwnerLookup()
                {
                    PersonNumber = "01025180093",
                },
            };

            string url = $"{versionPrefix}/instances?appId={applicationId}";

            HttpResponseMessage postResponse = await client.PostAsync(url, instanceData.AsJson());

            postResponse.EnsureSuccessStatusCode();

            string json = await postResponse.Content.ReadAsStringAsync();

            Instance instance = JsonConvert.DeserializeObject<Instance>(json);

            Assert.Equal("1", instance.InstanceOwnerId);            
        }

        private Application CreateTestApplication(string appId)
        {
            ApplicationClient appClient = new ApplicationClient(client);

            try
            {
                Application existingApp = appClient.GetApplication(appId);
                return existingApp;
            }
            catch (Exception)
            {
                // do nothing.
            }

            return appClient.CreateApplication(appId, null);
        }
    }
}
