using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.UnitTest.Util;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Altinn.Platform.Authorization.Services.Interface;
using Moq;
using System.Threading.Tasks;
using Xunit;
using System.Collections.Generic;
using Authorization.Interface.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Authorization.UnitTest
{
    /// <summary>
    /// Test class for <see cref="ContextHandler">
    /// </summary>
    public class ContextHandlerTest
    {
        private readonly Mock<IPolicyInformationRepository> _policyInformationRepositoryMock;
        private readonly Mock<IRoles> _rolesMock;
        private readonly ContextHandler _contextHandler;

        public ContextHandlerTest()
        {
            _policyInformationRepositoryMock = new Mock<IPolicyInformationRepository>();
            _rolesMock = new Mock<IRoles>();
            _contextHandler = new ContextHandler(_policyInformationRepositoryMock.Object, _rolesMock.Object);
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
        public async Task ContextHanler_TC01()
        {
            // Arrange
            string testCase = "AltinnApps0001";

            XacmlContextRequest request = TestSetupUtil.CreateXacmlContextRequest(testCase);
            XacmlContextRequest expectedEnrichedRequest = TestSetupUtil.GetEnrichedRequest(testCase);

            // Act

            Instance instance = TestSetupUtil.GetInstanceData("7dd3c208-0062-4ff6-9ef7-2384e9199a6c.json");
            List<Role> roles = TestSetupUtil.GetRoles(1, 1000);
            
            _policyInformationRepositoryMock.Setup(p => p.GetInstance(It.Is<string>(s => s.Equals("1000/7dd3c208-0062-4ff6-9ef7-2384e9199a6c")))).ReturnsAsync(instance);
            _rolesMock.Setup(p => p.GetDecisionPointRolesForUser(It.Is<int>(s => s.Equals(1)), It.Is<int>(p => p.Equals(1000)))).ReturnsAsync(roles);

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
        public async Task ContextHanlder_TC02()
        {
            // Arrange
            string testCase = "AltinnApps0002";

            XacmlContextRequest request = TestSetupUtil.CreateXacmlContextRequest(testCase);
            XacmlContextRequest expectedEnrichedRequest = TestSetupUtil.GetEnrichedRequest(testCase);

            // Act

            Instance instance = TestSetupUtil.GetInstanceData("26133fb5-a9f2-45d4-90b1-f6d93ad40713.json");
            List<Role> roles = TestSetupUtil.GetRoles(1, 1000);

            _policyInformationRepositoryMock.Setup(p => p.GetInstance(It.Is<string>(s => s.Equals("1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713")))).ReturnsAsync(instance);
            _rolesMock.Setup(p => p.GetDecisionPointRolesForUser(It.Is<int>(s => s.Equals(1)), It.Is<int>(p => p.Equals(1000)))).ReturnsAsync(roles);

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
        public async Task ContextHanlder_TC03()
        {
            // Arrange
            string testCase = "AltinnApps0003";

            XacmlContextRequest request = TestSetupUtil.CreateXacmlContextRequest(testCase);
            XacmlContextRequest expectedEnrichedRequest = TestSetupUtil.GetEnrichedRequest(testCase);

            // Act

            Instance instance = TestSetupUtil.GetInstanceData("26133fb5-a9f2-45d4-90b1-f6d93ad40713.json");
            List<Role> roles = TestSetupUtil.GetRoles(1, 1000);

            _policyInformationRepositoryMock.Setup(p => p.GetInstance(It.Is<string>(s => s.Equals("1000/26133fb5-a9f2-45d4-90b1-f6d93ad40713")))).ReturnsAsync(instance);
            _rolesMock.Setup(p => p.GetDecisionPointRolesForUser(It.Is<int>(s => s.Equals(1)), It.Is<int>(p => p.Equals(1000)))).ReturnsAsync(roles);

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
        public async Task ContextHanlder_TC04()
        {
            // Arrange
            string testCase = "AltinnApps0004";

            XacmlContextRequest request = TestSetupUtil.CreateXacmlContextRequest(testCase);
            XacmlContextRequest expectedEnrichedRequest = TestSetupUtil.GetEnrichedRequest(testCase);

            // Act

            List<Role> roles = TestSetupUtil.GetRoles(1, 1000);

            _rolesMock.Setup(p => p.GetDecisionPointRolesForUser(It.Is<int>(s => s.Equals(1)), It.Is<int>(p => p.Equals(1000)))).ReturnsAsync(roles);

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
        public async Task ContextHanlder_TC05()
        {
            // Arrange
            string testCase = "AltinnApps0004";

            XacmlContextRequest request = TestSetupUtil.CreateXacmlContextRequest(testCase);
            XacmlContextRequest expectedEnrichedRequest = TestSetupUtil.GetEnrichedRequest(testCase);

            // Act

            List<Role> roles = TestSetupUtil.GetRoles(1, 1000);

            _rolesMock.Setup(p => p.GetDecisionPointRolesForUser(It.Is<int>(s => s.Equals(1)), It.Is<int>(p => p.Equals(1000)))).ReturnsAsync(roles);

            XacmlContextRequest enrichedRequest = await _contextHandler.Enrich(request);

            // Assert
            Assert.NotNull(enrichedRequest);
            Assert.NotNull(expectedEnrichedRequest);
            AssertionUtil.AssertEqual(expectedEnrichedRequest, enrichedRequest);
        }
    }
}
