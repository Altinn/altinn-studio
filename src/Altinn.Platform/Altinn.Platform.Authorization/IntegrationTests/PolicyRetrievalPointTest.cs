using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.Repositories;
using Altinn.Platform.Authorization.Services.Implementation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Blob;
using Moq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    [Collection("Our Test Collection #1")]
    public class PolicyRetrievalPointTest : IClassFixture<PolicyRetrivevalPointFixture>
    {
        Mock<IOptions<AzureStorageConfiguration>> _storageConfigMock;
        private CloudBlobClient _blobClient;
        private CloudBlobContainer _blobContainer;
        private const string ORG = "ttd";
        private const string APP = "repository-test-app";
        private readonly PolicyRetrivevalPointFixture _fixture;
        private readonly PolicyRepository _pr;
        private readonly PolicyRetrievalPoint _prp;

        public PolicyRetrievalPointTest(PolicyRetrivevalPointFixture fixture)
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
            _prp = new PolicyRetrievalPoint(_pr);
        }

        /// <summary>
        /// Test case: Get file from storage.
        /// Expected: GetPolicyAsync returns a file that is not null.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC01()
        {
            // Arrange
            await PopulateBlobStorage();
            XacmlContextRequest request = new XacmlContextRequest(true, true, GetXacmlContextAttributesWithOrgAndApp());

            // Act
            XacmlPolicy xacmlPolicy = await _prp.GetPolicyAsync(request);

            // Assert
            Assert.NotNull(xacmlPolicy);
        }

        /// <summary>
        /// Test case: Get a file from storage that does not exists.
        /// Expected: GetPolicyAsync returns null.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC02()
        {
            // Arrange
            XacmlContextRequest request = new XacmlContextRequest(true, true, GetXacmlContextAttributesWithOrgAndApp());

            // Act
            XacmlPolicy xacmlPolicy = await _prp.GetPolicyAsync(request);

            // Assert
            Assert.Null(xacmlPolicy);
        }

        /// <summary>
        /// Test case: Get a file from storage with a request that does not contain information about org and app. 
        /// Expected: GetPolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC03()
        {
            // Arrange
            XacmlContextRequest request = new XacmlContextRequest(true, true, new List<XacmlContextAttributes>());

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _prp.GetPolicyAsync(request));
        }

        private List<XacmlContextAttributes> GetXacmlContextAttributesWithOrgAndApp()
        {
            List<XacmlContextAttributes> xacmlContexts = new List<XacmlContextAttributes>();

            XacmlContextAttributes xacmlContext = new XacmlContextAttributes(new Uri(XacmlConstants.MatchAttributeCategory.Resource));

            XacmlAttribute xacmlAttributeOrg = new XacmlAttribute(new Uri("urn:altinn:org"), true);
            xacmlAttributeOrg.AttributeValues.Add(new XacmlAttributeValue(new Uri("urn:altinn:org"), ORG));
            xacmlContext.Attributes.Add(xacmlAttributeOrg);

            xacmlContexts.Add(xacmlContext);

            XacmlContextAttributes xacmlContext2 = new XacmlContextAttributes(new Uri(XacmlConstants.MatchAttributeCategory.Resource));

            XacmlAttribute xacmlAttributeApp = new XacmlAttribute(new Uri("urn:altinn:app"), true);
            xacmlAttributeApp.AttributeValues.Add(new XacmlAttributeValue(new Uri("urn:altinn:app"), APP));
            xacmlContext2.Attributes.Add(xacmlAttributeApp);

            xacmlContexts.Add(xacmlContext2);

            return xacmlContexts;
        }

        private async Task PopulateBlobStorage()
        {
            await _blobContainer.CreateIfNotExistsAsync();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            await _pr.WritePolicyAsync($"{ORG}/{APP}/policy.xacml", dataStream);
        }
    }
}
