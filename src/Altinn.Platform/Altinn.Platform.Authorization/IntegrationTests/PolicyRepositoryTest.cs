using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.Repositories;
using Microsoft.Extensions.Options;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;
using Moq;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    public class PolicyRepositoryTest : IClassFixture<PlatformAuthorizationFixture>
    {
        Mock<IOptions<AzureStorageConfiguration>> _settingsMock;
        private CloudBlobClient _blobClient;
        private CloudBlobContainer _blobContainer;

        public PolicyRepositoryTest(PlatformAuthorizationFixture fixture)
        {
            _settingsMock = new Mock<IOptions<AzureStorageConfiguration>>();
            _settingsMock.Setup(s => s.Value).Returns(new AzureStorageConfiguration()
            {
                AccountName = "devstoreaccount1",
                AccountKey = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==",
                StorageContainer = "metadata",
                BlobEndPoint = "http://127.0.0.1:10000/devstoreaccount1"
            });
        }

        [Fact]
        public async Task WritePolicy_TC01()
        {
            await CreateCollection();
            Stream dataStream = File.OpenRead("IIA003Policy.xml");
            PolicyRepository pr = new PolicyRepository(_settingsMock.Object);
            string res = await pr.WritePolicy("testFile/testing", dataStream);
            Assert.NotNull(res);
        }

        private async Task<bool> CreateCollection()
        {
            // connect to azure blob storage
            StorageCredentials storageCredentials = new StorageCredentials("devstoreaccount1", "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==");
            CloudStorageAccount storageAccount = new CloudStorageAccount(storageCredentials, true);

            StorageUri storageUrl = new StorageUri(new Uri("http://127.0.0.1:10000/devstoreaccount1"));
            _blobClient = new CloudBlobClient(storageUrl, storageCredentials);


            _blobContainer = _blobClient.GetContainerReference("metadata");

            try
            {
                // Create the container if it does not already exist.
                bool result = await _blobContainer.CreateIfNotExistsAsync();
                if (result == true)
                {
                    Console.WriteLine("Created container {0}", _blobContainer.Name);
                }
                return result;
            }
            catch (StorageException e)
            {
                Console.WriteLine("HTTP error code {0}: {1}", e.RequestInformation.HttpStatusCode, e.RequestInformation.ErrorCode);
                Console.WriteLine(e.Message);
            }

            return false;
        }
    }
}
