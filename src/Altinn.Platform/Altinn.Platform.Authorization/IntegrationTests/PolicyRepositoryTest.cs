using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.Repositories;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;
using Moq;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    [Collection("Our Test Collection #1")]
    public class PolicyRepositoryTest : IClassFixture<PolicyRetrivevalPointFixture>
    {
        Mock<IOptions<AzureStorageConfiguration>> _storageConfigMock;
        private CloudBlobClient _blobClient;
        private CloudBlobContainer _blobContainer;
        private const string ORG = "ttd";
        private const string APP = "repository-test-app";
        private readonly PolicyRetrivevalPointFixture _fixture;
        private readonly PolicyRepository _pr;

        public PolicyRepositoryTest(PolicyRetrivevalPointFixture fixture)
        {
            _fixture = fixture;
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
            _pr = new PolicyRepository(_storageConfigMock.Object, new Mock<ILogger<PolicyRepository>>().Object);
        }

        /// <summary>
        /// Test case: Writing a file to storage and confirming that it is successfully stored.
        /// Expected: WritePolicy returns true
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC01()
        {
            // Arrange
            await _blobContainer.CreateIfNotExistsAsync();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");

            // Act
            bool successfullyStored = await _pr.WritePolicyAsync($"{ORG}/{APP}/policy.xml", dataStream);

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
            string expected = "http://127.0.0.1:10000/devstoreaccount1/metadata/ttd/tc-02-app/policy.xml";
            
            // Act
            await _pr.WritePolicyAsync($"{ORG}/tc-02-app/policy.xml", dataStream);

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
            await _pr.WritePolicyAsync($"{ORG}/{APP}/policy.xml", dataStream);

            CloudBlockBlob storedBlob = _blobContainer.GetBlockBlobReference($"ttd/repository-test-app/policy.xml");
            var memoryStream = new MemoryStream();
            await storedBlob.DownloadToStreamAsync(memoryStream);
            memoryStream.Position = 0;

            // Assert
            Assert.True(CompareStream(dataStream, memoryStream));
        }

        /// <summary>
        /// Test case: Writing a file to storage that does not already exists. 
        /// Expected: N blobs in container has increased by one after WritePolicy is called.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC04()
        {
            // Arrange
            await _blobContainer.CreateIfNotExistsAsync();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");

            // Act
            await _pr.WritePolicyAsync("org/app/policy.xml", dataStream);
            await _pr.WritePolicyAsync($"{ORG}/{APP}/policy.xml", dataStream);

            // Assert       
            BlobResultSegment blobResultSegment = await _blobContainer.ListBlobsSegmentedAsync("", true,
            new BlobListingDetails(), null, null, null, null);
            Assert.Equal(2, blobResultSegment.Results.Count());
        }

        /// <summary>
        /// Test case: Writing a file to storage when connection fails.
        /// Expected: WritePolicy throws a storage exception is thrown.
        /// </summary>
        // [Fact]
        public async Task WritePolicy_TC05()
        {
            // Arrange
            await _blobContainer.CreateIfNotExistsAsync();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            _fixture.StartAndWaitForExit("stop");
            await Task.Delay(2000);

            // Act & Assert       
            await Assert.ThrowsAsync<StorageException>(() => _pr.WritePolicyAsync($"{ORG}/tc-02-app/policy.xml", dataStream));

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
            await _pr.WritePolicyAsync($"{ORG}/{APP}/policy.xml", dataStream);
            await _pr.WritePolicyAsync($"{ORG}/{APP}/policy.xml", dataStream);

            // Assert       
            BlobResultSegment blobResultSegment = await _blobContainer.ListBlobsSegmentedAsync("", true,
            new BlobListingDetails(), null, null, null, null);
            Assert.Single(blobResultSegment.Results);
        }

        /// <summary>
        /// Test case: Get a file from storage that exists.
        /// Expected: GetPolicy returns MemoryStream.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC01()
        {
            // Arrange
            await PopulateBlobStorage();

            //Act
            Stream stream = await _pr.GetPolicyAsync($"{ORG}/{APP}/policy.xml");

            // Act & Assert
            Assert.IsType<MemoryStream>(stream);
        }

        /// <summary>
        /// Test case: Get a file from storage that does not exists.
        /// Expected: GetPolicy returns null.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC02()
        {
            // Arrange & Act
            Stream stream = await _pr.GetPolicyAsync("org/app4/policys.xml");

            // Assert
            Assert.Null(stream);
        }

        /// <summary>
        /// Test case: Get existing file from storage and comfirm that the content is correct .
        /// Expected: The contents of the stream once the blob is retrieved matches the expected content.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC03()
        {
            // Arrange
            await PopulateBlobStorage();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");

            // Act
            Stream stream = await _pr.GetPolicyAsync($"{ORG}/{APP}/policy.xml");

            // Assert
            Assert.True(CompareStream(dataStream, stream));
        }


        public bool CompareStream(Stream stream1, Stream stream2)
        {
            stream1.Position = 0;
            stream2.Position = 0;
            int streamByte1;
            int streamByte2;

            if (stream1.Length != stream2.Length)
            {
                return false;
            }
            do
            {
                streamByte1 = stream1.ReadByte();
                streamByte2 = stream2.ReadByte();
            } while ((streamByte1 == streamByte2) && (streamByte1 != -1));

            stream1.Close();
            stream2.Close();

            return ((streamByte1 - streamByte2) == 0);
        }

        private async Task PopulateBlobStorage()
        {
            await _blobContainer.CreateIfNotExistsAsync();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            await _pr.WritePolicyAsync($"{ORG}/{APP}/policy.xml", dataStream);
        }
    }
}
