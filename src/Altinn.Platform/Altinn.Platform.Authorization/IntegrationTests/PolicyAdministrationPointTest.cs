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

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    [Collection("PolicyAdministrationPointTest")]
    public class PolicyAdministrationPointTest : IClassFixture<PolicyRetrievalPointFixture>
    {
        private const string ORG = "ttd";
        private const string APP = "repository-test-app";

        private readonly IPolicyAdministrationPoint _pap;

        public PolicyAdministrationPointTest()
        {
            ServiceCollection services = new ServiceCollection();
            services.AddMemoryCache();
            ServiceProvider serviceProvider = services.BuildServiceProvider();

            IMemoryCache memoryCache = serviceProvider.GetService<IMemoryCache>();

            _pap = new PolicyAdministrationPoint(
                new PolicyRetrievalPoint(new PolicyRepositoryMock(), memoryCache, Options.Create(new GeneralSettings { PolicyCacheTimeout = 1 })),
                new PolicyRepositoryMock(),
                new PolicyDelegationRepositoryMock(),
                memoryCache,
                Options.Create(new GeneralSettings { PolicyCacheTimeout = 1 }));
        }

        /// <summary>
        /// Test case: Write to storage a file.
        /// Expected: WritePolicyAsync returns true.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC01()
        {
            // Arrange
            Stream dataStream = File.OpenRead("Data/Policies/policy.xml");

            // Act
            bool successfullyStored = await _pap.WritePolicyAsync("org", "app", dataStream);
            TestSetupUtil.DeleteAppBlobData("org", "app");

            // Assert
            Assert.True(successfullyStored);
        }

        /// <summary>
        /// Test case: Write a file to storage where the org parameter arguments is empty.
        /// Expected: WritePolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC02()
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _pap.WritePolicyAsync(string.Empty, "app", new MemoryStream()));
        }

        /// <summary>
        /// Test case: Write a file to storage where the app parameter arguments is empty.
        /// Expected: WritePolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC03()
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _pap.WritePolicyAsync("org", string.Empty, new MemoryStream()));
        }

        /// <summary>
        /// Test case: Write to storage a file that is null.
        /// Expected: WritePolicyAsync throws ArgumentException.
        /// </summary>
        [Fact]
        public async Task WritePolicy_TC04()
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() => _pap.WritePolicyAsync("org", "app", null));
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
