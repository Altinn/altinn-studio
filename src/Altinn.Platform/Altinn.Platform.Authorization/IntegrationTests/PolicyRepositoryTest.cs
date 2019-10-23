using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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
        private const string ORG = "ttd";
        private const string APP = "repository-test-app";
        private readonly PlatformAuthorizationFixture _fixture;

        public PolicyRepositoryTest(PlatformAuthorizationFixture fixture)
        {
            _fixture = fixture;
            _settingsMock = new Mock<IOptions<AzureStorageConfiguration>>();
            _settingsMock.Setup(s => s.Value).Returns(new AzureStorageConfiguration()
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
        }

        /// <summary>
        /// Test case: Writing a file to storage and confirming that is is successfully stored.
        /// Expected: WritePolicy returns true
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC01()
        {
            // Arrange
            await _blobContainer.CreateIfNotExistsAsync();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");

            // Act
            PolicyRepository pr = new PolicyRepository(_settingsMock.Object);
            bool successfullyStored = await pr.WritePolicy($"{ORG}/{APP}/policy.xml", dataStream);

            // Assert
            CloudBlockBlob storedBlob = _blobContainer.GetBlockBlobReference($"ttd/repository-test-app/policy.xml");
            await storedBlob.FetchAttributesAsync();
            Assert.True(successfullyStored);
        }

        /// <summary>
        /// Test case: Writing a file to storage and confirming that is is stored under the correct name.
        /// Expected: There is a match in the container for the filename sent as input to WritePolicy.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC02()
        {
            // Arrange
            await _blobContainer.CreateIfNotExistsAsync();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            string expected = $"{_blobContainer.Uri.ToString()}/ttd/tc-02-app/policy.xml";
            
            // Act
            PolicyRepository pr = new PolicyRepository(_settingsMock.Object);
            await pr.WritePolicy($"{ORG}/tc-02-app/policy.xml", dataStream);

            BlobResultSegment blobResultSegment = await _blobContainer.ListBlobsSegmentedAsync("", true,
            new BlobListingDetails(), null, null, null, null);
            List<string> uris = blobResultSegment.Results.Select(i => i.StorageUri.PrimaryUri.ToString()).ToList();

            // Assert       
            Assert.Contains(uris, i => i.Equals(expected));
        }

        /// <summary>
        /// Test case: Writing a file to storage and confirming that the contents is correct.
        /// Expected: The contents of the stream once the blob is retrieved matches the initial filestream.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC03()
        {
            // Arrange
            await _blobContainer.CreateIfNotExistsAsync();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");

            // Act
            // TO DO


            // Assert       
            // TO DO
        }

        /// <summary>
        /// Test case: Writing a file to storage and confirming number of blobs in collection
        /// Expected: N blobs in container after WritePolicy is called.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC04()
        {
            // Arrange
            await _blobContainer.CreateIfNotExistsAsync();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");

            // Act
            // TO DO


            // Assert       
            // TO DO
        }

        /// <summary>
        /// Test case: Writing a file to storage when connection fails.
        /// Expected: WritePolicy throws a storage exception is thrown.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC05()
        {
            // Arrange
            await _blobContainer.CreateIfNotExistsAsync();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            _fixture.StartAndWaitForExit("stop");
            await Task.Delay(2000);

            // Act
            PolicyRepository pr = new PolicyRepository(_settingsMock.Object);
            await pr.WritePolicy($"{ORG}/tc-02-app/policy.xml", dataStream);

            // Assert       
            // TO DO

            // Cleanup
            _fixture.StartAndWaitForExit("start");
            await Task.Delay(2000);
        }

        /// <summary>
        /// Test case: Writing over existing file in storage confirm only one file exists.
        /// Expected: Number of blobs in collection is the same before and after WritePolicy is called.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC06()
        {
            // Arrange
            await _blobContainer.CreateIfNotExistsAsync();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");

            // Act
            // TO DO

            // Assert       
            // TO DO
        }
    }
}
