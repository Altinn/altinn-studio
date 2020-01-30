using System;
using System.Collections.Generic;
using System.Net.Http;
using Altinn.Platform.Storage.IntegrationTest.Clients;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using Xunit;

#pragma warning disable SA1600 // ElementsMustBeDocumented
#pragma warning disable CS1591
namespace Altinn.Platform.Storage.IntegrationTest
{
    [Collection("Sequential")]
    public class ApplicationClientTests : IClassFixture<PlatformStorageFixture>, IClassFixture<CosmosDBFixture>, IDisposable
    {
        private readonly PlatformStorageFixture fixture;
        private readonly ApplicationClient applicationClient;
        private readonly HttpClient httpClient;

        public ApplicationClientTests(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.httpClient = fixture.Client;
            this.applicationClient = new ApplicationClient(httpClient);
        }

        /// <summary>
        /// Make sure repository is cleaned after the tests is run.
        /// </summary>
        public void Dispose()
        {
            string org = "test";
            string listUri = $"storage/api/v1/applications/{org}";

            HttpResponseMessage listResponse = httpClient.GetAsync(listUri).Result;

            if (listResponse.IsSuccessStatusCode)
            {
                string json = listResponse.Content.ReadAsStringAsync().Result;

                ApplicationList applicationList = JsonConvert.DeserializeObject<ApplicationList>(json);

                foreach (Application app in applicationList.Applications)
                {
                    string appId = app.Id;

                    string deleteUri = $"storage/api/v1/applications/{appId}?hard=true";

                    HttpResponseMessage deleteResponse = httpClient.DeleteAsync(deleteUri).Result;
                }
            }
        }

        [Fact]
        public void TestApplicationClient()
        {
            LanguageString title = new LanguageString
            {
                { "nb", "testapplikasjon" },
                { "en", "Test application" },
            };

            Application appMetadata = applicationClient.CreateApplication("test/sailor", title);

            Assert.Equal("test/sailor", appMetadata.Id);

            Application appMetadata2 = applicationClient.GetApplication("test/sailor");

            Assert.Equal(appMetadata.Id, appMetadata2.Id);
        }

        [Fact]
        public void TestApplicationClientCreate()
        {
            Application application = new Application()
            {
                Id = "test/xml",
                VersionId = "1.2.0",
                Org = "test",
                Title = new LanguageString
                {
                    { "nb", "XML test application" },
                },
                ValidFrom = new DateTime(2019, 07, 01),
                ValidTo = new DateTime(2020, 06, 30)
            };

            Application result = applicationClient.CreateApplication(application);

            result.ValidTo = null;

            result = applicationClient.UpdateApplication(result);

            Assert.Equal("test/xml", result.Id);
            Assert.Null(result.ValidTo);
        }
    }
}
