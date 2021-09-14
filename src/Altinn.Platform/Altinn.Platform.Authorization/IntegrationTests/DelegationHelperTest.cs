using System.Collections.Generic;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.Helpers;
using Altinn.Platform.Authorization.IntegrationTests.Data;
using Altinn.Platform.Authorization.IntegrationTests.MockServices;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Services.Implementation;

using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    /// <summary>
    /// Test class for <see cref="ContextHandler"></see>
    /// </summary>
    public class DelegationHelperTest 
    {
        public DelegationHelperTest()
        {
        }

        /// <summary>
        /// Scenario:
        /// Tests the SortRulesByDelegationPolicyPath function
        /// Input:
        /// List of un ordered rules for delegation of 3 different apps to/from the same set of OfferedBy/CoveredBy parties
        /// Expected Result:
        /// Dictionary with rules sorted by the path of the 3 delegation policy files
        /// Success Criteria:
        /// Dictionary with the expected keys (policy paths) and values (sorted rules for each file)
        /// </summary>
        [Fact]
        public void SortRulesByDelegationPolicyPath_ThreeAppsSameOfferedByAndCoveredBy_Success()
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
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "App2"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Write", "org1", "app1", "task1"), // Should be sorted together with the first rule
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1", task: null, "event1") // Should be sorted together with the first rule
            };

            Dictionary<string, List<Rule>> expected = new Dictionary<string, List<Rule>>();
            expected.Add($"org1/app1/{offeredByPartyId}/{coveredBy}/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Write", "org1", "app1", "task1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1",  task: null, "event1")
            });
            expected.Add($"org2/app1/{offeredByPartyId}/{coveredBy}/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org2", "app1")
            });
            expected.Add($"org1/App2/{offeredByPartyId}/{coveredBy}/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "App2")
            });

            // Act
            Dictionary<string, List<Rule>> actual = DelegationHelper.SortRulesByDelegationPolicyPath(unsortedRules);

            // Assert
            Assert.NotNull(actual);

            Assert.Equal(expected.Keys.Count, actual.Keys.Count);
            foreach (string expectedPathKey in expected.Keys)
            {
                Assert.True(actual.ContainsKey(expectedPathKey));
                Assert.Equal(expected[expectedPathKey].Count, actual[expectedPathKey].Count);
                AssertionUtil.AssertEqual(expected[expectedPathKey], actual[expectedPathKey]);
            }
        }

        /// <summary>
        /// Scenario:
        /// Tests the SortRulesByDelegationPolicyPath function
        /// Input:
        /// List of un ordered rules for delegation of the same apps from the same OfferedBy to two CoveredBy users, and one coveredBy organization/partyid
        /// Expected Result:
        /// Dictionary with rules sorted by the path of the 3 delegation policy files
        /// Success Criteria:
        /// Dictionary with the expected keys (policy paths) and values (sorted rules for each file)
        /// </summary>
        [Fact]
        public void SortRulesByDelegationPolicyPath_OneAppSameOfferedBy_ThreeCoveredBy_Success()
        {
            // Arrange
            int delegatedByUserId = 20001336;
            int offeredByPartyId = 50001337;

            List<Rule> unsortedRules = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", XacmlRequestAttribute.UserAttribute, "Read", "org1", "app1", "task1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001331", XacmlRequestAttribute.UserAttribute, "Read", "org1", "app1", null, "event1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "50001333", XacmlRequestAttribute.PartyAttribute, "Read", "org1", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", XacmlRequestAttribute.UserAttribute, "Write", "org1", "app1") // Should be sorted together with the first rule
            };

            Dictionary<string, List<Rule>> expected = new Dictionary<string, List<Rule>>();
            expected.Add($"org1/app1/{offeredByPartyId}/20001337/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", XacmlRequestAttribute.UserAttribute, "Read", "org1", "app1", "task1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", XacmlRequestAttribute.UserAttribute, "Write", "org1", "app1")
            });
            expected.Add($"org1/app1/{offeredByPartyId}/20001331/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001331", XacmlRequestAttribute.UserAttribute, "Read", "org1", "app1", null, "event1"),
            });
            expected.Add($"org1/app1/{offeredByPartyId}/50001333/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "50001333", XacmlRequestAttribute.PartyAttribute, "Read", "org1", "app1"),
            });

            // Act
            Dictionary<string, List<Rule>> actual = DelegationHelper.SortRulesByDelegationPolicyPath(unsortedRules);

            // Assert
            Assert.NotNull(actual);

            Assert.Equal(expected.Keys.Count, actual.Keys.Count);
            foreach (string expectedPathKey in expected.Keys)
            {
                Assert.True(actual.ContainsKey(expectedPathKey));
                Assert.Equal(expected[expectedPathKey].Count, actual[expectedPathKey].Count);
                AssertionUtil.AssertEqual(expected[expectedPathKey], actual[expectedPathKey]);
            }
        }
    }
}
