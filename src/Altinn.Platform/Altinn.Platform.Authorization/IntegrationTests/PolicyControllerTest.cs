using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Microsoft.Extensions.Options;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;
using Moq;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    public class PolicyControllerTest : IClassFixture<PlatformAuthorizationFixture>
    {
        private readonly HttpClient _client;
        private const string ORG = "ttd";
        private const string APP = "repository-test-app";
        private readonly PlatformAuthorizationFixture _fixture;
        public PolicyControllerTest(PlatformAuthorizationFixture fixture)
        {
            _fixture = fixture;
            _client = _fixture.GetClient();
      

            /*
            _storageConfigMock = new Mock<IOptions<AzureStorageConfiguration>>();
            _storageConfigMock.Setup(s => s.Value).Returns(new AzureStorageConfiguration()
            {
                AccountName = "devstoreaccount1",
                AccountKey = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==",
                StorageContainer = "metadata",
                BlobEndPoint = "http://127.0.0.1:10000/devstoreaccount1"
            });

            // connect to azure blob storage
            StorageCredentials storageCredentials = new StorageCredentials("devstoreaccount1", "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==");
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);

            StorageUri storageUrl = new StorageUri(new Uri("http://127.0.0.1:10000/devstoreaccount1"));
            _blobClient = new CloudBlobClient(storageUrl, storageCredentials);
            _blobContainer = _blobClient.GetContainerReference("metadata");
            */
        }

        /// <summary>
        /// Test case: Get existing file from storage.
        /// Expected: GetPolicyAsync returns a file that is not null and status code 200.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC01()
        {
            // Arrange

            // Act
            HttpResponseMessage response = await _client.PostAsync("authorization/api/v1/policies/", null);


            // Assert

        }

        /// <summary>
        /// Test case: Get existing file from storage where request is null.
        /// Expected: GetPolicyAsync returns status code 500 and a descriptive error message.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC02()
        {
            // Arrange


            // Act


            // Assert

        }
    }
}
