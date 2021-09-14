using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;

using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.IntegrationTests.Data;
using Altinn.Platform.Authorization.IntegrationTests.Fixtures;
using Altinn.Platform.Authorization.IntegrationTests.MockServices;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Services.Implementation;
using Altinn.Platform.Authorization.Services.Interface;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
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

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicyRules function, whether
        /// Input:
        /// List of un ordered rules for delegation of the same apps from the same OfferedBy to two CoveredBy users, and one coveredBy organization/partyid
        /// Expected Result:
        /// Dictionary with rules sorted by the path of the 3 delegation policy files
        /// Success Criteria:
        /// Dictionary with the expected keys (policy paths) and values (sorted rules for each file)
        /// </summary>
        [Fact]
        public async Task TryWriteDelegationPolicyRules_Valid()
        {
            // Arrange
            int delegatedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            string coveredBy = "20001337";
            string coveredByType = XacmlRequestAttribute.UserAttribute;

            List<Rule> unsortedRules = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org2", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app2"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Write", "org1", "app1", "task1"), // Should be sorted together with the first rule
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1", task: null, "event1") // Should be sorted together with the first rule
            };

            Dictionary<string, bool> expected = new Dictionary<string, bool>();
            expected.Add($"org1/app1/{offeredByPartyId}/{coveredBy}/delegationpolicy.xml", true);
            expected.Add($"org2/app1/{offeredByPartyId}/{coveredBy}/delegationpolicy.xml", true);
            expected.Add($"org1/app2/{offeredByPartyId}/{coveredBy}/delegationpolicy.xml", true);

            // Act
            Dictionary<string, bool> actual = await _pap.TryWriteDelegationPolicyRules(unsortedRules);

            // Assert
            Assert.Equal(expected.Keys.Count, actual.Keys.Count);
            Assert.True(expected.Keys.All(key => actual.ContainsKey(key)));
            Assert.True(expected.Keys.All(key => expected[key] == actual[key]));
        }
    }
}
