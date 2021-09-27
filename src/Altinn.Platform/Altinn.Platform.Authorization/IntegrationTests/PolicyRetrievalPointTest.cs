using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;

using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.IntegrationTests.MockServices;
using Altinn.Platform.Authorization.IntegrationTests.Util;

using Altinn.Platform.Authorization.Services.Implementation;
using Altinn.Platform.Authorization.Services.Interface;
using Azure;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    [Collection("Our Test Collection #1")]
    public class PolicyRetrievalPointTest : IClassFixture<PolicyRetrievalPointFixture>
    {
        private const string ORG = "ttd";
        private const string APP = "repository-test-app";

        private readonly IPolicyRetrievalPoint _prp;

        public PolicyRetrievalPointTest()
        {
            ServiceCollection services = new ServiceCollection();
            services.AddMemoryCache();
            ServiceProvider serviceProvider = services.BuildServiceProvider();

            IMemoryCache memoryCache = serviceProvider.GetService<IMemoryCache>();

            _prp = new PolicyRetrievalPoint(
                new PolicyRepositoryMock(),
                memoryCache,
                Options.Create(new GeneralSettings { PolicyCacheTimeout = 1 }));
        }

        /// <summary>
        /// Test case: Get file from storage.
        /// Expected: GetPolicyAsync returns a file that is not null.
        /// </summary>
        [Fact]
        public async Task GetPolicy_TC01()
        {
            // Arrange
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
            XacmlContextRequest request = new XacmlContextRequest(true, true, GetXacmlContextAttributesWithOrgAndApp(false));

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

        /// <summary>
        /// Test case: Get file from storage.
        /// Expected: GetPolicyAsync returns a file that is not null.
        /// </summary>
        [Fact]
        public async Task GetPolicy_ByOrgApp_ReturnsPolicy()
        {
            // Arrange
            string org = "ttd";
            string app = "repository-test-app";

            // Act
            XacmlPolicy xacmlPolicy = await _prp.GetPolicyAsync(org, app);

            // Assert
            Assert.NotNull(xacmlPolicy);
        }

        /// <summary>
        /// Test case: Get a file from storage that does not exists.
        /// Expected: GetPolicyAsync returns null.
        /// </summary>
        [Fact]
        public async Task GetPolicy_ByOrgApp_NullWhenPolicyNotExists()
        {
            // Arrange
            string org = "1";
            string app = "2";

            // Act
            XacmlPolicy xacmlPolicy = await _prp.GetPolicyAsync(org, app);

            // Assert
            Assert.Null(xacmlPolicy);
        }

        /// <summary>
        /// Test case: Get a file from storage with a request that does not contain information about app. 
        /// Expected: GetPolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task GetPolicy_ByOrgApp_ThrowsException()
        {
            // Arrange
            string org = "ttd";
            string app = string.Empty;

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _prp.GetPolicyAsync(org, app));
        }

        private List<XacmlContextAttributes> GetXacmlContextAttributesWithOrgAndApp(bool existingApp = true)
        {
            List<XacmlContextAttributes> xacmlContexts = new List<XacmlContextAttributes>();

            XacmlContextAttributes xacmlContext = new XacmlContextAttributes(new Uri(XacmlConstants.MatchAttributeCategory.Resource));

            XacmlAttribute xacmlAttributeOrg = new XacmlAttribute(new Uri("urn:altinn:org"), true);
            xacmlAttributeOrg.AttributeValues.Add(new XacmlAttributeValue(new Uri("urn:altinn:org"), ORG));
            xacmlContext.Attributes.Add(xacmlAttributeOrg);

            xacmlContexts.Add(xacmlContext);

            XacmlContextAttributes xacmlContext2 = new XacmlContextAttributes(new Uri(XacmlConstants.MatchAttributeCategory.Resource));

            XacmlAttribute xacmlAttributeApp = new XacmlAttribute(new Uri("urn:altinn:app"), true);
            if (existingApp)
            {
                xacmlAttributeApp.AttributeValues.Add(new XacmlAttributeValue(new Uri("urn:altinn:app"), APP));
            }
            else
            {
                xacmlAttributeApp.AttributeValues.Add(new XacmlAttributeValue(new Uri("urn:altinn:app"), "dummy-app"));
            }

            xacmlContext2.Attributes.Add(xacmlAttributeApp);

            xacmlContexts.Add(xacmlContext2);

            return xacmlContexts;
        }
    }
}
