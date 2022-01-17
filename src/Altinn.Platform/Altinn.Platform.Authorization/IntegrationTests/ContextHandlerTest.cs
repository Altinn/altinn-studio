using System.Threading.Tasks;

using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.IntegrationTests.MockServices;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.Services.Implementation;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    /// <summary>
    /// Test class for <see cref="ContextHandler"></see>
    /// </summary>
    public class ContextHandlerTest 
    {
        private readonly ContextHandler _contextHandler;

        public ContextHandlerTest()
        {
            _contextHandler = new ContextHandler(
                new InstanceMetadataRepositoryMock(),
                new RolesMock(),
                new MemoryCache(new MemoryCacheOptions()),
                Options.Create(new GeneralSettings { RoleCacheTimeout = 5 }));
        }

        /// <summary>
        /// Scenario:
        /// Tests if the xacml request is enriched with the required resource, subject attributes
        /// Input:
        /// Instance id, user id, action
        /// Expected Result:
        /// Xacml request is enriched with the missing resource, roles and subject attributes
        /// Success Criteria:
        /// A xacml request populated with the required attributes is returned
        /// </summary>
        [Fact]
        public async Task ContextHandler_TC01()
        {
            // Arrange
            string testCase = "AltinnApps0021";

            XacmlContextRequest request = TestSetupUtil.CreateXacmlContextRequest(testCase);
            XacmlContextRequest expectedEnrichedRequest = TestSetupUtil.GetEnrichedRequest(testCase);

            // Act
            XacmlContextRequest enrichedRequest = await _contextHandler.Enrich(request);

            // Assert
            Assert.NotNull(enrichedRequest);
            Assert.NotNull(expectedEnrichedRequest);
            AssertionUtil.AssertEqual(expectedEnrichedRequest, enrichedRequest);
        }

        /// <summary>
        /// Scenario:
        /// Tests if the xacml request is enriched with the required resource, subject attributes
        /// Input:
        /// Instance id, org, action
        /// Expected Result:
        /// Xacml request is enriched with the missing resource and subject attributes
        /// Success Criteria:
        /// A xacml request populated with the required attributes is returned
        /// </summary>
        [Fact]
        public async Task ContextHandler_TC02()
        {
            // Arrange
            string testCase = "AltinnApps0022";

            XacmlContextRequest request = TestSetupUtil.CreateXacmlContextRequest(testCase);
            XacmlContextRequest expectedEnrichedRequest = TestSetupUtil.GetEnrichedRequest(testCase);

            // Act
            XacmlContextRequest enrichedRequest = await _contextHandler.Enrich(request);

            // Assert
            Assert.NotNull(enrichedRequest);
            Assert.NotNull(expectedEnrichedRequest);
            AssertionUtil.AssertEqual(expectedEnrichedRequest, enrichedRequest);
        }

        /// <summary>
        /// Scenario:
        /// Tests if the xacml request is enriched with the required resource, subject attributes
        /// Input:
        /// Complete resource attributes
        /// Expected Result:
        /// Xacml request is enriched with the missing role attributes
        /// Success Criteria:
        /// A xacml request populated with the required attributes is returned
        /// </summary>
        [Fact]
        public async Task ContextHandler_TC03()
        {
            // Arrange
            string testCase = "AltinnApps0023";

            XacmlContextRequest request = TestSetupUtil.CreateXacmlContextRequest(testCase);
            XacmlContextRequest expectedEnrichedRequest = TestSetupUtil.GetEnrichedRequest(testCase);

            // Act
            XacmlContextRequest enrichedRequest = await _contextHandler.Enrich(request);

            // Assert
            Assert.NotNull(enrichedRequest);
            Assert.NotNull(expectedEnrichedRequest);
            AssertionUtil.AssertEqual(expectedEnrichedRequest, enrichedRequest);
        }

        /// <summary>
        /// Scenario:
        /// Tests if the xacml request is enriched with the required resource, subject attributes
        /// Input:
        /// org, app, userid, partyid, action
        /// Expected Result:
        /// Xacml request is enriched with the missing role attributes
        /// Success Criteria:
        /// A xacml request populated with the required attributes is returned
        /// </summary>
        [Fact]
        public async Task ContextHandler_TC04()
        {
            // Arrange
            string testCase = "AltinnApps0024";

            XacmlContextRequest request = TestSetupUtil.CreateXacmlContextRequest(testCase);
            XacmlContextRequest expectedEnrichedRequest = TestSetupUtil.GetEnrichedRequest(testCase);

            // Act
            XacmlContextRequest enrichedRequest = await _contextHandler.Enrich(request);

            // Assert
            Assert.NotNull(enrichedRequest);
            Assert.NotNull(expectedEnrichedRequest);
            AssertionUtil.AssertEqual(expectedEnrichedRequest, enrichedRequest);
        }

        /// <summary>
        /// Scenario:
        /// Tests if the xacml request is enriched with the required resource, subject attributes
        /// Input:
        /// org, app, party id, action
        /// Expected Result:
        /// Xacml request is enriched with the missing role attributes
        /// Success Criteria:
        /// A xacml request populated with the required attributes is returned
        /// </summary>
        [Fact]
        public async Task ContextHandler_TC05()
        {
            // Arrange
            string testCase = "AltinnApps0025";

            XacmlContextRequest request = TestSetupUtil.CreateXacmlContextRequest(testCase);
            XacmlContextRequest expectedEnrichedRequest = TestSetupUtil.GetEnrichedRequest(testCase);

            // Act
            XacmlContextRequest enrichedRequest = await _contextHandler.Enrich(request);

            // Assert
            Assert.NotNull(enrichedRequest);
            Assert.NotNull(expectedEnrichedRequest);
            AssertionUtil.AssertEqual(expectedEnrichedRequest, enrichedRequest);
        }

        /// <summary>
        /// Scenario:
        /// Tests if the xacml request is enriched with the required resource, subject attributes
        /// Input:
        /// Instance-id, user-id, party-id
        /// Expected Result:
        /// Xacml request is enriched with the missing attributes
        /// Success Criteria:
        /// A xacml request populated with the required attributes is returned
        /// </summary>
        [Fact]
        public async Task ContextHandler_TC06()
        {
            // Arrange
            string testCase = "AltinnApps0026";

            XacmlContextRequest request = TestSetupUtil.CreateXacmlContextRequest(testCase);
            XacmlContextRequest expectedEnrichedRequest = TestSetupUtil.GetEnrichedRequest(testCase);

            // Act
            XacmlContextRequest enrichedRequest = await _contextHandler.Enrich(request);

            // Assert
            Assert.NotNull(enrichedRequest);
            Assert.NotNull(expectedEnrichedRequest);
            AssertionUtil.AssertEqual(expectedEnrichedRequest, enrichedRequest);
        }
    }
}
