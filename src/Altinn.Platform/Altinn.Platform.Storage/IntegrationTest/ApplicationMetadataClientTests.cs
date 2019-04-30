using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.IntegrationTest.Client;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.Models;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    public class ApplicationMetadataClientTests : IClassFixture<PlatformStorageFixture>
    {
        private readonly PlatformStorageFixture fixture;
        private readonly ApplicationMetadataClient applicationClient;
        private readonly HttpClient httpClient;

        public ApplicationMetadataClientTests(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.httpClient = fixture.Client;
            this.applicationClient = new ApplicationMetadataClient(httpClient);
        }

        [Fact]
        public void TestApplicationClient()
        {
            Dictionary<string, string> title = new Dictionary<string, string>
            {
                { "nb", "testapplikasjon" },
                { "en", "Test application" }
            };

            ApplicationMetadata appMetadata = applicationClient.CreateApplication("TEST-sailor", title);

            Assert.Equal("TEST-sailor", appMetadata.Id);
        }

        [Fact]
        public void TestApplicationClientCreate()
        {
            //ignore;
        }
    }
}
