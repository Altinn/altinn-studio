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
using Altinn.Platform.Authorization.Repositories.Interface;
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
        private readonly IPolicyRepository _prp;

        public PolicyAdministrationPointTest()
        {
            ServiceCollection services = new ServiceCollection();
            services.AddMemoryCache();
            ServiceProvider serviceProvider = services.BuildServiceProvider();

            IMemoryCache memoryCache = serviceProvider.GetService<IMemoryCache>();

            _prp = new PolicyRepositoryMock();
            _pap = new PolicyAdministrationPoint(
                new PolicyRetrievalPoint(_prp, memoryCache, Options.Create(new GeneralSettings { PolicyCacheTimeout = 1 })),
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
        /// Tests the TryWriteDelegationPolicyRules function, whether all rules are returned as successfully created
        /// Input:
        /// List of unordered rules for delegation of the same apps from the same OfferedBy to two CoveredBy users, and one coveredBy organization/partyid
        /// Expected Result:
        /// List of all rules (now in sorted order of the resulting 3 delegation policy files) with success flag and rule id set.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryWriteDelegationPolicyRules_Valid()
        {
            // Arrange
            int delegatedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            string coveredBy = "20001337";
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;

            List<Rule> unsortedRules = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org2", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app2"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Write", "org1", "app1", "task1"), // Should be sorted together with the first rule
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1", task: null, "event1") // Should be sorted together with the first rule
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Write", "org1", "app1", "task1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1", task: null, "event1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org2", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app2", createdSuccessfully: true)
            };

            // Act
            List<Rule> actual = await _pap.TryWriteDelegationPolicyRules(unsortedRules);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => r.CreatedSuccessfully));
            Assert.True(actual.All(r => !string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicyRules function, when only partial set of the rules are returned as successfully created
        /// Input:
        /// List of unordered rules for delegation of the same apps from the same OfferedBy to two CoveredBy users, and one coveredBy organization/partyid
        /// Expected Result:
        /// List of all rules (now in sorted order of the resulting 3 delegation policy files) with success flag and rule id set.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryWriteDelegationPolicyRules_PartialSuccess()
        {
            // Arrange
            int delegatedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            string coveredBy = "20001337";
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;

            List<Rule> unsortedRules = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org2", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "unknownorg", "unknownapp"), // Should fail as there is no App Policy for this app
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Write", "org1", "app1", "task1"), // Should be sorted together with the first rule
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1", task: null, "event1") // Should be sorted together with the first rule
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Write", "org1", "app1", "task1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1", task: null, "event1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org2", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "unknownorg", "unknownapp", createdSuccessfully: false)
            };

            // Act
            List<Rule> actual = await _pap.TryWriteDelegationPolicyRules(unsortedRules);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.Where(r => r.CreatedSuccessfully).All(r => !string.IsNullOrEmpty(r.RuleId)));
            Assert.True(actual.Where(r => !r.CreatedSuccessfully).All(r => string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicyRules function, when only partial set of the rules are returned as successfully created, caused by one of the rules not having a complete model for sorting to a delegation policy filepath
        /// Input:
        /// List of unordered rules for delegation of the same apps from the same OfferedBy to two CoveredBy users, and one coveredBy organization/partyid
        /// Expected Result:
        /// List of all rules (now in sorted order of the resulting 3 delegation policy files) with success flag and rule id set.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryWriteDelegationPolicyRules_PartialSuccess_UnsortableRule()
        {
            // Arrange
            int delegatedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            string coveredBy = "20001337";
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;

            List<Rule> unsortedRules = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org2", "app1"),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", null, null), // Should fail as the rule model is not complete (missing org/app)
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Write", "org1", "app1", "task1"), // Should be sorted together with the first rule
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1", task: null, "event1") // Should be sorted together with the first rule
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Write", "org1", "app1", "task1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org1", "app1", task: null, "event1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read", "org2", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "Read",  null, null, createdSuccessfully: false)
            };

            // Act
            List<Rule> actual = await _pap.TryWriteDelegationPolicyRules(unsortedRules);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.Where(r => r.CreatedSuccessfully).All(r => !string.IsNullOrEmpty(r.RuleId)));
            Assert.True(actual.Where(r => !r.CreatedSuccessfully).All(r => string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
        }
    }
}
