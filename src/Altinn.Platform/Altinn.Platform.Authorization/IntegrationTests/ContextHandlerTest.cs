using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    public class ContextHandlerTest : IClassFixture<PlatformAuthorizationFixture>
    {
        private readonly PlatformAuthorizationFixture _fixture;
        private readonly ContextHandler _contextHandler;
        public ContextHandlerTest(PlatformAuthorizationFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task ContextHanler_TC01()
        {
            string testCase = "AltinnApps0001";

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
