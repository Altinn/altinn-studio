using System;
using System.Collections.Generic;
using System.Net.Http;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.Models;
using Xunit;

#pragma warning disable SA1600 // ElementsMustBeDocumented
#pragma warning disable CS1591
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

            ApplicationMetadata appMetadata2 = applicationClient.GetApplicationMetadata("TEST-sailor");

            Assert.Equal(appMetadata.Id, appMetadata2.Id);
        }

        [Fact]
        public void TestApplicationClientCreate()
        {
            ApplicationMetadata appMetadata = new ApplicationMetadata()
            {
                Id = "TEST-xml",
                VersionId = "1.2.0",
                ApplicationOwnerId = "TEST",
                Title = new Dictionary<string, string>
                {
                    { "nb", "XML test application" },
                },
                ValidFrom = new DateTime(2019, 07, 01),
                ValidTo = new DateTime(2020, 06, 30),
                MaxSize = 200000,
            };
            ApplicationMetadata result;
            try
            {
                result = applicationClient.CreateApplication(appMetadata);
            }
            catch (HttpRequestException e)
            {
                string statusText = e.ToString();

                result = applicationClient.UpdateApplicationMetadata(appMetadata);
            }

            Assert.Equal("TEST-xml", result.Id);
            Assert.Equal(200000, result.MaxSize);
        }
    }
}
