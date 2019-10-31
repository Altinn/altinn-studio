using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.Repositories;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Microsoft.Azure.Documents.Client;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    public class ContextHandlerTest : IClassFixture<PolicyInformationPointFixture>
    {
        Mock<IOptions<AzureCosmosSettings>> _dbConfigMock;
        private readonly PolicyInformationPointFixture _fixture;
        private readonly ContextHandler _contextHandler;
        private static DocumentClient _client;
        private readonly PolicyInformationRepository _pir;
        private const string INSTANCE_ID = "50005297/697064e4-4961-428c-ac33-67c4fa99754b";
        private const int INSTANCE_OWNER_ID = 50005297;
        private const string ORG = "tdd";
        private const string APP = "tdd-cat";

        public ContextHandlerTest(PolicyInformationPointFixture fixture)
        {
            _fixture = fixture;
            _dbConfigMock = new Mock<IOptions<AzureCosmosSettings>>();
            _dbConfigMock.Setup(s => s.Value).Returns(new AzureCosmosSettings()
            {
                EndpointUri = "https://localhost:8081",
                PrimaryKey = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
                Database = "ServiceEngine",
                InstanceCollection = "Instance",
                ApplicationCollection = "applications"
            });

            ConnectionPolicy connectionPolicy = new ConnectionPolicy
            {
                ConnectionMode = ConnectionMode.Gateway,
                ConnectionProtocol = Protocol.Https,
            };

            _client = new DocumentClient(new Uri("https://localhost:8081"),
                "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
                connectionPolicy);
            _client.OpenAsync();

            _pir = new PolicyInformationRepository(_dbConfigMock.Object, new Mock<ILogger<PolicyInformationRepository>>().Object);
            _contextHandler = new ContextHandler(_pir);
        }

        [Fact]
        public async Task ContextHanler_TC01()
        {
            // Arrange
            string testCase = "AltinnApps0013";

            XacmlContextRequest request  = TestSetupUtil.CreateXacmlContextRequest(testCase);
            XacmlContextRequest expectedEnrichedRequest = TestSetupUtil.GetEnrichedRequest(testCase);

            // Act
            XacmlContextRequest enrichedRequest = await _contextHandler.Enrich(request);

            // Assert
            Assert.NotNull(enrichedRequest);
            Assert.NotNull(expectedEnrichedRequest);
            Assert.Equal(expectedEnrichedRequest.Attributes.Count, enrichedRequest.Attributes.Count);
        }
    }
}
