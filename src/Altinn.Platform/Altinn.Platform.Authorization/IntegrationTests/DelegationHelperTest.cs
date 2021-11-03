using System.Collections.Generic;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.Helpers;
using Altinn.Platform.Authorization.IntegrationTests.Data;
using Altinn.Platform.Authorization.IntegrationTests.MockServices;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Services.Implementation;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    /// <summary>
    /// Test class for <see cref="ContextHandler"></see>
    /// </summary>
    public class DelegationHelperTest 
    {
        private PolicyRetrievalPointMock _prpMock = new PolicyRetrievalPointMock(new HttpContextAccessor());

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
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;

            List<Rule> unsortedRules = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "read", "org1", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "read", "org2", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "read", "org1", "App2"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "write", "org1", "app1", "task1"), // Should be sorted together with the first rule
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "read", "org1", "app1", task: null, "event1") // Should be sorted together with the first rule
            };

            Dictionary<string, List<Rule>> expected = new Dictionary<string, List<Rule>>();
            expected.Add($"org1/app1/{offeredByPartyId}/{coveredBy}/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "read", "org1", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "write", "org1", "app1", "task1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "read", "org1", "app1",  task: null, "event1")
            });
            expected.Add($"org2/app1/{offeredByPartyId}/{coveredBy}/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "read", "org2", "app1")
            });
            expected.Add($"org1/App2/{offeredByPartyId}/{coveredBy}/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "read", "org1", "App2")
            });

            // Act
            Dictionary<string, List<Rule>> actual = DelegationHelper.SortRulesByDelegationPolicyPath(unsortedRules, out List<Rule> unsortables);

            // Assert
            Assert.NotNull(actual);
            Assert.Empty(unsortables);

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
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "read", "org1", "app1", "task1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001331", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "read", "org1", "app1", null, "event1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "50001333", AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute, "read", "org1", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "write", "org1", "app1") // Should be sorted together with the first rule
            };

            Dictionary<string, List<Rule>> expected = new Dictionary<string, List<Rule>>();
            expected.Add($"org1/app1/{offeredByPartyId}/20001337/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "read", "org1", "app1", "task1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "write", "org1", "app1")
            });
            expected.Add($"org1/app1/{offeredByPartyId}/20001331/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001331", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "read", "org1", "app1", null, "event1"),
            });
            expected.Add($"org1/app1/{offeredByPartyId}/50001333/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "50001333", AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute, "read", "org1", "app1"),
            });

            // Act
            Dictionary<string, List<Rule>> actual = DelegationHelper.SortRulesByDelegationPolicyPath(unsortedRules, out List<Rule> unsortables);

            // Assert
            Assert.NotNull(actual);
            Assert.Empty(unsortables);

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
        public void SortRulesByDelegationPolicyPath_Unsortables_Success()
        {
            // Arrange
            int delegatedByUserId = 20001336;
            int offeredByPartyId = 50001337;

            List<Rule> unsortedRules = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "read", "org1", "app1", "task1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "read", null, "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "write", "org1", "app1")
            };

            Dictionary<string, List<Rule>> expected = new Dictionary<string, List<Rule>>();
            expected.Add($"org1/app1/{offeredByPartyId}/20001337/delegationpolicy.xml", new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "read", "org1", "app1", "task1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "write", "org1", "app1")
            });

            List<Rule> expectedUnsortable = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, "20001337", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "read", null, "app1")
            };

            // Act
            Dictionary<string, List<Rule>> actual = DelegationHelper.SortRulesByDelegationPolicyPath(unsortedRules, out List<Rule> unsortables);

            // Assert
            Assert.NotNull(actual);

            Assert.Equal(expectedUnsortable.Count, unsortables.Count);
            AssertionUtil.AssertEqual(expectedUnsortable, unsortables);

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
        /// Tests that the PolicyContainsMatchingRule function returns true when it finds a given API rule model as a XacmlRule in a XacmlPolicy
        /// Input:
        /// A XacmlPolicy containing read and write rules for org1/app1, and a API Rule model for write
        /// Expected Result:
        /// True
        /// Success Criteria:
        /// Rule is found and expected result is returned
        /// </summary>
        [Fact]
        public async void PolicyContainsMatchingRule_PolicyContainsRule_True()
        {
            // Arrange
            Rule rule = TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "write", "org1", "app1");
            XacmlPolicy policy = await _prpMock.GetPolicyAsync("org1", "app1");

            // Act
            bool actual = DelegationHelper.PolicyContainsMatchingRule(policy, rule);

            // Assert
            Assert.True(actual);
        }

        /// <summary>
        /// Scenario:
        /// Tests that the PolicyContainsMatchingRule function returns true when it finds a given API rule model as a XacmlRule in a XacmlPolicy
        /// Input:
        /// A XacmlPolicy containing read and write rules for org1/app1, and a API Rule model for read
        /// Expected Result:
        /// True
        /// Success Criteria:
        /// Rule is found and expected result is returned
        /// </summary>
        [Fact]
        public async void PolicyContainsMatchingRule_PolicyContainsRule_PolicyResourcesOutOfOrder_True()
        {
            // Arrange
            Rule rule = TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "read", "org1", "unorderedresources");
            XacmlPolicy policy = await _prpMock.GetPolicyAsync("org1", "unorderedresources");

            // Act
            bool actual = DelegationHelper.PolicyContainsMatchingRule(policy, rule);

            // Assert
            Assert.True(actual);
        }

        /// <summary>
        /// Scenario:
        /// Tests that the PolicyContainsMatchingRule function returns true when it finds a given API rule model as a XacmlRule in a XacmlPolicy
        /// Input:
        /// A XacmlPolicy containing a single rule for spanning multiple different resources and actions
        /// A rule for one of the last combinations for action and resource (eat, banana) 
        /// Expected Result:
        /// True
        /// Success Criteria:
        /// Rule is found and expected result is returned
        /// </summary>
        [Fact]
        public async void PolicyContainsMatchingRule_PolicyContainsRule_SingleComplexRulePolicy_True()
        {
            // Arrange
            Rule rule = TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "eat", "org1", "singlecomplexrule", appresource: "banana");
            XacmlPolicy policy = await _prpMock.GetPolicyAsync("org1", "singlecomplexrule");

            // Act
            bool actual = DelegationHelper.PolicyContainsMatchingRule(policy, rule);

            // Assert
            Assert.True(actual);
        }

        /// <summary>
        /// Scenario:
        /// Tests that the PolicyContainsMatchingRule function returns true when it finds a given API rule model as a XacmlRule in a XacmlPolicy
        /// Input:
        /// A XacmlPolicy containing XacmlRule for sign on task1 for org1/app1, and a API Rule model representation for the same rule
        /// Expected Result:
        /// True
        /// Success Criteria:
        /// Rule is found and expected result is returned
        /// </summary>
        [Fact]
        public async void PolicyContainsMatchingRule_PolicyContainsRule_SignForTask_True()
        {
            // Arrange
            Rule rule = TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "sign", "org1", "app1", task: "task1");
            XacmlPolicy policy = await _prpMock.GetPolicyAsync("org1", "app1");

            // Act
            bool actual = DelegationHelper.PolicyContainsMatchingRule(policy, rule);

            // Assert
            Assert.True(actual);
        }

        /// <summary>
        /// Scenario:
        /// Tests that the PolicyContainsMatchingRule function returns false when it does not find a given API rule model as a XacmlRule in a XacmlPolicy
        /// Input:
        /// A XacmlPolicy containing read and write rules for org1/app1, and a API Rule model for sign
        /// Expected Result:
        /// False
        /// Success Criteria:
        /// Rule is not found and expected result is returned
        /// </summary>
        [Fact]
        public async void PolicyContainsMatchingRule_PolicyContainsRule_InvalidAction_False()
        {
            // Arrange
            Rule rule = TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "sign", "org1", "app1");
            XacmlPolicy policy = await _prpMock.GetPolicyAsync("org1", "app1");

            // Act
            bool actual = DelegationHelper.PolicyContainsMatchingRule(policy, rule);

            // Assert
            Assert.False(actual);
        }

        /// <summary>
        /// Scenario:
        /// Tests that the PolicyContainsMatchingRule function returns false when it does not find a given API rule model as a XacmlRule in a XacmlPolicy
        /// Input:
        /// A XacmlPolicy containing read and write rules for org1/app1, and a API Rule model for read but for org2/app1
        /// Expected Result:
        /// False
        /// Success Criteria:
        /// Rule is not found and expected result is returned
        /// </summary>
        [Fact]
        public async void PolicyContainsMatchingRule_PolicyContainsRule_InvalidOrg_False()
        {
            // Arrange
            Rule rule = TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "read", "org2", "app1");
            XacmlPolicy policy = await _prpMock.GetPolicyAsync("org1", "app1");

            // Act
            bool actual = DelegationHelper.PolicyContainsMatchingRule(policy, rule);

            // Assert
            Assert.False(actual);
        }

        /// <summary>
        /// Scenario:
        /// Tests that the PolicyContainsMatchingRule function returns false when it does not find a given API rule model as a XacmlRule in a XacmlPolicy
        /// Input:
        /// A XacmlPolicy containing read and write rules for org1/app1, and a API Rule model for read but for org1/app2
        /// Expected Result:
        /// False
        /// Success Criteria:
        /// Rule is not found and expected result is returned
        /// </summary>
        [Fact]
        public async void PolicyContainsMatchingRule_PolicyContainsRule_InvalidApp_False()
        {
            // Arrange
            Rule rule = TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "read", "org2", "app1");
            XacmlPolicy policy = await _prpMock.GetPolicyAsync("org1", "app1");

            // Act
            bool actual = DelegationHelper.PolicyContainsMatchingRule(policy, rule);

            // Assert
            Assert.False(actual);
        }

        /// <summary>
        /// Scenario:
        /// Tests that the PolicyContainsMatchingRule function returns false when the App policy does not contain org/app level resource specification.
        /// Input:
        /// A XacmlPolicy containing no rules with resource specification on org/app level (all resources are more specific e.g incl task/appresource)
        /// A rule which match action but not a complete resource match
        /// Expected Result:
        /// False
        /// Success Criteria:
        /// Rule is not found and expected result is returned
        /// </summary>
        [Fact]
        public async void PolicyContainsMatchingRule_PolicyContainsRule_PolicyWithoutAppLevelResource_False()
        {
            // Arrange
            Rule rule = TestDataHelper.GetRuleModel(20001337, 50001337, "20001336", AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "eat", "org1", "singlecomplexrule");
            XacmlPolicy policy = await _prpMock.GetPolicyAsync("org1", "singlecomplexrule");

            // Act
            bool actual = DelegationHelper.PolicyContainsMatchingRule(policy, rule);

            // Assert
            Assert.False(actual);
        }
    }
}
