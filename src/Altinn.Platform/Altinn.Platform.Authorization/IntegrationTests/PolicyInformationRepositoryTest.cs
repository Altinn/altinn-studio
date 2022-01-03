using System;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.Repositories;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    public class PolicyInformationRepositoryTest : IClassFixture<PolicyInformationPointFixture>, IDisposable
    {
        private Mock<IOptions<AzureCosmosSettings>> _dbConfigMock;
        private readonly PolicyInformationPointFixture _fixture;
        private static DocumentClient _client;
        private readonly InstanceMetadataRepository _pir;
        private const string INSTANCE_ID = "50013976/f3fc6233-1631-429d-8405-e1678f88dbd7";
        private const int INSTANCE_OWNER_ID = 50013976;
        private const string ORG = "tdd";
        private const string APP = "tdd-cat";
        private readonly string databaseId;
        private readonly string instanceCollectionId;
        private bool databasePopulatedInstances = false;
        private bool databasePopulatedApplications = false;

        public PolicyInformationRepositoryTest(PolicyInformationPointFixture fixture)
        {
            _fixture = fixture;
            _dbConfigMock = new Mock<IOptions<AzureCosmosSettings>>();
            _dbConfigMock.Setup(s => s.Value).Returns(new AzureCosmosSettings()
            {
                EndpointUri = "https://localhost:8081",
                PrimaryKey = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
                Database = "Storage",
                InstanceCollection = "instances",
                ApplicationCollection = "applications"
            });

            ConnectionPolicy connectionPolicy = new ConnectionPolicy
            {
                ConnectionMode = ConnectionMode.Gateway,
                ConnectionProtocol = Protocol.Https,
            };

            databaseId = _dbConfigMock.Object.Value.Database;
            instanceCollectionId = _dbConfigMock.Object.Value.InstanceCollection;

            _client = new DocumentClient(
                new Uri("https://localhost:8081"),
                "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
                connectionPolicy);
            _client.OpenAsync();

            _pir = new InstanceMetadataRepository(_dbConfigMock.Object, new Mock<ILogger<InstanceMetadataRepository>>().Object);
        }

        /// <summary>
        /// Make sure repository is cleaned after the tests is run.
        /// </summary>
        public void Dispose()
        {
            if (databasePopulatedInstances)
            {
                Uri docUri = UriFactory.CreateDocumentUri(databaseId, instanceCollectionId, "f3fc6233-1631-429d-8405-e1678f88dbd7");

                _client.DeleteDocumentAsync(docUri, new RequestOptions { PartitionKey = new PartitionKey("50013976") });
            }

            if (databasePopulatedApplications)
            {
                Uri docUri2 = UriFactory.CreateDocumentUri(databaseId, "applications", APP);

                _client.DeleteDocumentAsync(docUri2, new RequestOptions { PartitionKey = new PartitionKey(ORG) });
            }
        }

        /// <summary>
        /// Test case: Get from cosmos a exsisting instance
        /// Expected: GetInstance returns instance that is not null
        /// </summary>
        //[Fact]
        public async Task GetInstance_TC01()
        {
            // Arrange
            if (!databasePopulatedInstances)
            {
                await PopulateCosmosDbAsyncWithInstance();
            }

            // Act
            Instance instance = await _pir.GetInstance(INSTANCE_ID, INSTANCE_OWNER_ID);

            // Assert
            Assert.NotNull(instance);
        }

        /// <summary>
        /// Test case: Get from cosmos a instance that do not exist
        /// Expected: GetInstance returns null
        /// </summary>
        //[Fact]
        public async Task GetInstance_TC02()
        {
            // Arrange
            if (!databasePopulatedInstances)
            {
                await PopulateCosmosDbAsyncWithInstance();
            }

            // Act
            Instance instance = await _pir.GetInstance(INSTANCE_ID, INSTANCE_OWNER_ID + 1);

            // Assert
            Assert.Null(instance);
        }

        /// <summary>
        /// Test case: Get instance from cosmos where instanceId is null
        /// Expected: GetInstance throws ArgumentNullException
        /// </summary>
        //[Fact]
        public async Task GetInstance_TC03()
        {
            // Arrange
            if (!databasePopulatedInstances)
            {
                await PopulateCosmosDbAsyncWithInstance();
            }

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentNullException>(() => _pir.GetInstance(null, INSTANCE_OWNER_ID));
        }

        /// <summary>
        /// Test case: Get instance from cosmos where instanceOwnerId is negative or 0
        /// Expected: GetInstance throws ArgumentException
        /// </summary>
        //[Fact]
        public async Task GetInstance_TC04()
        {
            // Arrange
            if (!databasePopulatedInstances)
            {
                await PopulateCosmosDbAsyncWithInstance();
            }

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _pir.GetInstance(INSTANCE_ID, -1));
        }

        /// <summary>
        /// Test case: Get from cosmos a exsisting instance
        /// Expected: GetInstance returns instance with same instanceId and instanceOwnerId as sent in
        /// </summary>
       // [Fact]
        public async Task GetInstance_TC05()
        {
            // Arrange
            if (!databasePopulatedInstances)
            {
                await PopulateCosmosDbAsyncWithInstance();
            }

            // Act
            Instance instance = await _pir.GetInstance(INSTANCE_ID, INSTANCE_OWNER_ID);

            // Assert
            Assert.Equal(INSTANCE_ID, instance.Id);
            Assert.Equal(INSTANCE_OWNER_ID.ToString(), instance.InstanceOwner.PartyId);
        }

        /// <summary>
        /// Test case: Get from cosmos an exsisting application
        /// Expected: GetInstance returns application that is not null
        /// </summary>
        //[Fact]
        public async Task GetApplication_TC01()
        {
            // Arrange
            if (!databasePopulatedApplications)
            {
                await PopulateCosmosDbAsyncWithApplication();
            }

            // Act
            Application application = await _pir.GetApplication(APP, ORG);

            // Assert
            Assert.NotNull(application);
        }

        /// <summary>
        /// Test case: Get from cosmos an application that do not exist
        /// Expected: GetInstance returns null
        /// </summary>
        //[Fact]
        public async Task GetApplication_TC02()
        {
            // Arrange
            if (!databasePopulatedApplications)
            {
                await PopulateCosmosDbAsyncWithApplication();
            }

            // Act
            Application application = await _pir.GetApplication(APP + "2", ORG);

            // Assert
            Assert.Null(application);
        }

        /// <summary>
        /// Test case: Get from cosmos an application where app is null
        /// Expected: GetInstance throws ArgumentNullException
        /// </summary>
        //[Fact]
        public async Task GetApplication_TC03()
        {
            // Arrange
            if (!databasePopulatedApplications)
            {
                await PopulateCosmosDbAsyncWithApplication();
            }

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentNullException>(() => _pir.GetApplication(null, ORG));
        }

        /// <summary>
        /// Test case: Get from cosmos an application where org is null
        /// Expected: GetInstance throws ArgumentNullException
        /// </summary>
        //[Fact]
        public async Task GetApplication_TC04()
        {
            // Arrange
            if (!databasePopulatedApplications)
            {
                await PopulateCosmosDbAsyncWithApplication();
            }

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentNullException>(() => _pir.GetApplication(APP, null));
        }

        /// <summary>
        /// Test case: Get from cosmos an exsisting application
        /// Expected: GetApplication returns application with the same app and org as sent in
        /// </summary>
        //[Fact]
        public async Task GetApplication_TC05()
        {
            // Arrange
            if (!databasePopulatedApplications)
            {
                await PopulateCosmosDbAsyncWithApplication();
            }

            // Act
            Application application = await _pir.GetApplication(APP, ORG);

            // Assert
            Assert.Equal("tdd/cat", application.Id);
            Assert.Equal(ORG, application.Org);
        }

        private async Task PopulateCosmosDbAsyncWithInstance()
        {
            Uri uri = UriFactory.CreateDocumentCollectionUri(databaseId, instanceCollectionId);
            Stream dataStream = File.OpenRead(Path.Combine(TestSetupUtil.GetInstancePath(), "50013976/f3fc6233-1631-429d-8405-e1678f88dbd7.json"));
            dataStream.Position = 0;

            string json;

            using (StreamReader sr = new StreamReader(dataStream))
            {
                json = sr.ReadToEnd();
            }

            JObject jsonObject = JObject.Parse(json);

            try
            {
                await _client.CreateDocumentAsync(uri, jsonObject);
                databasePopulatedInstances = true;
            }
            catch (Exception ex)
            {
                databasePopulatedInstances = false;
            }
        }

        private async Task PopulateCosmosDbAsyncWithApplication()
        {
            Uri uri = UriFactory.CreateDocumentCollectionUri(databaseId, "applications");
            Stream dataStream = File.OpenRead(Path.Combine(TestSetupUtil.GetApplicationPath(), "tdd/cat/tdd-cat.json"));
            dataStream.Position = 0;

            string json;

            using (StreamReader sr = new StreamReader(dataStream))
            {
                json = sr.ReadToEnd();
            }

            JObject jsonObject = JObject.Parse(json);

            try
            {
                await _client.CreateDocumentAsync(uri, jsonObject);
                databasePopulatedApplications = true;
            }
            catch (Exception ex)
            {
                databasePopulatedApplications = false;
            }
        }
    }
}
