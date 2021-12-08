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
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    [Collection("PolicyAdministrationPointTest")]
    public class PolicyAdministrationPointTest : IClassFixture<PolicyAdministrationPointFixture>
    {
        private readonly IPolicyAdministrationPoint _pap;
        private readonly IPolicyRepository _prp;
        private readonly Mock<ILogger<IPolicyAdministrationPoint>> _logger;
        private DelegationMetadataRepositoryMock _delegationMetadataRepositoryMock;

        public PolicyAdministrationPointTest()
        {
            ServiceCollection services = new ServiceCollection();
            services.AddMemoryCache();
            ServiceProvider serviceProvider = services.BuildServiceProvider();

            IMemoryCache memoryCache = serviceProvider.GetService<IMemoryCache>();

            _logger = new Mock<ILogger<IPolicyAdministrationPoint>>();
            _delegationMetadataRepositoryMock = new DelegationMetadataRepositoryMock();
            _prp = new PolicyRepositoryMock();
            _pap = new PolicyAdministrationPoint(
                new PolicyRetrievalPoint(_prp, memoryCache, Options.Create(new GeneralSettings { PolicyCacheTimeout = 1 })),
                _prp,
                _delegationMetadataRepositoryMock,
                _logger.Object);
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
        /// Tests the TryWriteDelegationPolicyRules function, whether all rules are returned as successfully deleated whera all rules are deleted the db is also updated with isDeleted status
        /// Input:
        /// List of unordered rules for deletion multiple apps same OfferedBy to one CoveredBy user, and one coveredBy organization/partyid
        /// Expected Result:
        /// List of all rules actualy deleted.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryDeleteDelegationPolicyRules_Valid()
        {
            // Arrange
            int performedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            int coveredBy = 20001337;
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;
            _delegationMetadataRepositoryMock.MetadataChanges = new Dictionary<string, List<DelegationChange>>();

            List<RequestToDelete> inputRuleMatchess = new List<RequestToDelete>
            {
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app3", new List<string> { "urn:altinn:ruleid:0d0c8570-64fb-49f9-9f7d-45c057fddf94", "urn:altinn:ruleid:6f11dd0b-5e5d-4bd1-85f0-9796300dfded" }, coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org2", "app3", new List<string> { "urn:altinn:ruleid:244278c1-7c6b-4f6b-b6e9-2bd41f84812f" }, coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app4", new List<string> { "urn:altinn:ruleid:adfa64fa-5859-46e5-8d0d-62762082f3b9" }, coveredByUserId: coveredBy)                
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org2", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app4", createdSuccessfully: true)
            };

            Dictionary<string, List<DelegationChange>> expectedDbUpdates = new Dictionary<string, List<DelegationChange>>
            {
                { "org1/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
                { "org2/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org2/app3", offeredByPartyId, performedByUserId, isDeleted: false, coveredByUserId: coveredBy) } },
                { "org1/app4/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app4", offeredByPartyId, performedByUserId, isDeleted: false, coveredByUserId: coveredBy) } }
            };

            // Act
            List<Rule> actual = await _pap.TryDeleteDelegationPolicyRules(inputRuleMatchess);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => r.CreatedSuccessfully));
            Assert.True(actual.All(r => !string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
            AssertionUtil.AssertEqual(expectedDbUpdates, _delegationMetadataRepositoryMock.MetadataChanges);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicyRules function, whether all rules are returned as successfully deleated whera all rules are deleted the db is also updated with isDeleted status
        /// Input:
        /// List of unordered rules for deletion multiple apps same OfferedBy to one CoveredBy user, and one coveredBy organization/partyid
        /// Expected Result:
        /// List of all rules actualy deleted.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryDeleteDelegationPolicyRules_ForOrganizationValid()
        {
            // Arrange
            int performedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            int coveredBy = 50001336;
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute;
            _delegationMetadataRepositoryMock.MetadataChanges = new Dictionary<string, List<DelegationChange>>();

            List<RequestToDelete> inputRuleMatchess = new List<RequestToDelete>
            {
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app1", new List<string> { "urn:altinn:ruleid:57b3ee85-f932-42c6-9ab0-941eb6c96eb0",  "urn:altinn:ruleid:78e5cced-3bcb-42b6-9089-63c834f89e73" }, coveredByPartyId: coveredBy)
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app1", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org1", "app1", "task1", createdSuccessfully: true),
            };

            Dictionary<string, List<DelegationChange>> expectedDbUpdates = new Dictionary<string, List<DelegationChange>>
            {
                { "org1/app1/50001337/p50001336", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app1", offeredByPartyId, performedByUserId, isDeleted: false, coveredByPartyId: coveredBy) } },
            };

            // Act
            List<Rule> actual = await _pap.TryDeleteDelegationPolicyRules(inputRuleMatchess);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => r.CreatedSuccessfully));
            Assert.True(actual.All(r => !string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
            AssertionUtil.AssertEqual(expectedDbUpdates, _delegationMetadataRepositoryMock.MetadataChanges);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicyRules function, whether one rules are returned as not successfully deleated due to error updating data in db whera all rules are deleted the db is also updated with isDeleted status
        /// Input:
        /// List of unordered rules for deletion multiple apps same OfferedBy to one CoveredBy user, and one coveredBy organization/partyid
        /// Expected Result:
        /// List of all rules actualy deleted.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryDeleteDelegationPolicyRules_DBUpdateFail()
        {
            // Arrange
            int performedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            int coveredBy = 20001337;
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;
            _delegationMetadataRepositoryMock.MetadataChanges = new Dictionary<string, List<DelegationChange>>();

            List<RequestToDelete> inputRuleMatchess = new List<RequestToDelete>
            {
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app3", new List<string> { "urn:altinn:ruleid:0d0c8570-64fb-49f9-9f7d-45c057fddf94", "urn:altinn:ruleid:6f11dd0b-5e5d-4bd1-85f0-9796300dfded" }, coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org2", "app3", new List<string> { "urn:altinn:ruleid:244278c1-7c6b-4f6b-b6e9-2bd41f84812f" }, coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "error", "postgrewritechangefail", new List<string> { "urn:altinn:ruleid:ade3b138-7fa4-4c83-9306-8ec4a72c2daa" }, coveredByUserId: coveredBy)
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org2", "app3", createdSuccessfully: true),
            };

            Dictionary<string, List<DelegationChange>> expectedDbUpdates = new Dictionary<string, List<DelegationChange>>
            {
                { "org1/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
                { "org2/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org2/app3", offeredByPartyId, performedByUserId, isDeleted: false, coveredByUserId: coveredBy) } },
            };

            // Act
            List<Rule> actual = await _pap.TryDeleteDelegationPolicyRules(inputRuleMatchess);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => r.CreatedSuccessfully));
            Assert.True(actual.All(r => !string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
            AssertionUtil.AssertEqual(expectedDbUpdates, _delegationMetadataRepositoryMock.MetadataChanges);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicyRules function, whether one rules are returned as not successfully deleated due to error retriving data from db whera all rules are deleted the db is also updated with isDeleted status
        /// Input:
        /// List of unordered rules for deletion multiple apps same OfferedBy to one CoveredBy user, and one coveredBy organization/partyid
        /// Expected Result:
        /// List of all rules actualy deleted.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryDeleteDelegationPolicyRules_DBFetchFail()
        {
            // Arrange
            int performedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            int coveredBy = 20001337;
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;
            _delegationMetadataRepositoryMock.MetadataChanges = new Dictionary<string, List<DelegationChange>>();

            List<RequestToDelete> inputRuleMatchess = new List<RequestToDelete>
            {
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app3", new List<string> { "urn:altinn:ruleid:0d0c8570-64fb-49f9-9f7d-45c057fddf94", "urn:altinn:ruleid:6f11dd0b-5e5d-4bd1-85f0-9796300dfded" }, coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org2", "app3", new List<string> { "urn:altinn:ruleid:244278c1-7c6b-4f6b-b6e9-2bd41f84812f" }, coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "error", "postgregetcurrentfail", new List<string> { "urn:altinn:ruleid:ade3b138-7fa4-4c83-9306-8ec4a72c2daa" }, coveredByUserId: coveredBy)
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org2", "app3", createdSuccessfully: true),
            };

            Dictionary<string, List<DelegationChange>> expectedDbUpdates = new Dictionary<string, List<DelegationChange>>
            {
                { "org1/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
                { "org2/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org2/app3", offeredByPartyId, performedByUserId, isDeleted: false, coveredByUserId: coveredBy) } },
            };

            // Act
            List<Rule> actual = await _pap.TryDeleteDelegationPolicyRules(inputRuleMatchess);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => r.CreatedSuccessfully));
            Assert.True(actual.All(r => !string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
            AssertionUtil.AssertEqual(expectedDbUpdates, _delegationMetadataRepositoryMock.MetadataChanges);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicyRules function, whether one rules are returned as not successfully deleated due to error locking data for update in blob storage where all rules are deleted the db is also updated with isDeleted status
        /// Input:
        /// List of unordered rules for deletion multiple apps same OfferedBy to one CoveredBy user, and one coveredBy organization/partyid
        /// Expected Result:
        /// List of all rules actualy deleted.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryDeleteDelegationPolicyRules_DataStorageLeaseFail()
        {
            // Arrange
            int performedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            int coveredBy = 20001337;
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;
            _delegationMetadataRepositoryMock.MetadataChanges = new Dictionary<string, List<DelegationChange>>();

            List<RequestToDelete> inputRuleMatchess = new List<RequestToDelete>
            {
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app3", new List<string> { "urn:altinn:ruleid:0d0c8570-64fb-49f9-9f7d-45c057fddf94", "urn:altinn:ruleid:6f11dd0b-5e5d-4bd1-85f0-9796300dfded" }, coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org2", "app3", new List<string> { "urn:altinn:ruleid:244278c1-7c6b-4f6b-b6e9-2bd41f84812f" }, coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "error", "blobstorageleaselockwritefail", new List<string> { "urn:altinn:ruleid:ade3b138-7fa4-4c83-9306-8ec4a72c2daa" }, coveredByUserId: coveredBy)
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org2", "app3", createdSuccessfully: true),
            };

            Dictionary<string, List<DelegationChange>> expectedDbUpdates = new Dictionary<string, List<DelegationChange>>
            {
                { "org1/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
                { "org2/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org2/app3", offeredByPartyId, performedByUserId, isDeleted: false, coveredByUserId: coveredBy) } },
            };

            // Act
            List<Rule> actual = await _pap.TryDeleteDelegationPolicyRules(inputRuleMatchess);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => r.CreatedSuccessfully));
            Assert.True(actual.All(r => !string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
            AssertionUtil.AssertEqual(expectedDbUpdates, _delegationMetadataRepositoryMock.MetadataChanges);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicyRules function, whether one rules are returned as not successfully deleated due to error finding the file on blob storage where all rules are deleted the db is also updated with isDeleted status
        /// Input:
        /// List of unordered rules for deletion multiple apps same OfferedBy to one CoveredBy user, and one coveredBy organization/partyid
        /// Expected Result:
        /// List of all rules actualy deleted.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryDeleteDelegationPolicyRules_PolicyPathDoesNotExist()
        {
            // Arrange
            int performedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            int coveredBy = 20001337;
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;
            _delegationMetadataRepositoryMock.MetadataChanges = new Dictionary<string, List<DelegationChange>>();

            List<RequestToDelete> inputRuleMatchess = new List<RequestToDelete>
            {
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app8", new List<string> { "urn:altinn:ruleid:0d0c8570-64fb-49f9-9f7d-45c057fddf94" }, coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org2", "app3", new List<string> { "urn:altinn:ruleid:244278c1-7c6b-4f6b-b6e9-2bd41f84812f" }, coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app4", new List<string> { "urn:altinn:ruleid:adfa64fa-5859-46e5-8d0d-62762082f3b9" }, coveredByUserId: coveredBy)
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org2", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app4", createdSuccessfully: true)
            };

            Dictionary<string, List<DelegationChange>> expectedDbUpdates = new Dictionary<string, List<DelegationChange>>
            {
                { "org2/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org2/app3", offeredByPartyId, performedByUserId, isDeleted: false, coveredByUserId: coveredBy) } },
                { "org1/app4/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app4", offeredByPartyId, performedByUserId, isDeleted: false, coveredByUserId: coveredBy) } }
            };

            // Act
            List<Rule> actual = await _pap.TryDeleteDelegationPolicyRules(inputRuleMatchess);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => r.CreatedSuccessfully));
            Assert.True(actual.All(r => !string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
            AssertionUtil.AssertEqual(expectedDbUpdates, _delegationMetadataRepositoryMock.MetadataChanges);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicies function, all rules are returned as successfully created
        /// Input:
        /// List of unordered rules for deletion of the same apps from the same OfferedBy to one CoveredBy user
        /// Expected Result:
        /// List of all rules deleted returned.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryDeleteDelegationPolicies_Valid()
        {
            // Arrange
            int performedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            int coveredBy = 20001337;
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;
            _delegationMetadataRepositoryMock.MetadataChanges = new Dictionary<string, List<DelegationChange>>();

            List<RequestToDelete> inputRuleMatchess = new List<RequestToDelete>
            {
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app3", coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org2", "app3", coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app4", coveredByUserId: coveredBy)
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org2", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org2", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app4", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org1", "app4", createdSuccessfully: true),
            };

            Dictionary<string, List<DelegationChange>> expectedDbUpdates = new Dictionary<string, List<DelegationChange>>
            {
                { "org1/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
                { "org2/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org2/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
                { "org1/app4/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app4", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } }
            };

            // Act
            List<Rule> actual = await _pap.TryDeleteDelegationPolicies(inputRuleMatchess);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => r.CreatedSuccessfully));
            Assert.True(actual.All(r => !string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
            AssertionUtil.AssertEqual(expectedDbUpdates, _delegationMetadataRepositoryMock.MetadataChanges);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicies function, one rule are returned as failed due to error locking the data for update
        /// Input:
        /// List of unordered rules for deletion of the same apps from the same OfferedBy to one CoveredBy user
        /// Expected Result:
        /// List of all rules deleted returned.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryDeleteDelegationPolicies_StorageLeaseFail()
        {
            // Arrange
            int performedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            int coveredBy = 20001337;
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;
            _delegationMetadataRepositoryMock.MetadataChanges = new Dictionary<string, List<DelegationChange>>();

            List<RequestToDelete> inputRuleMatchess = new List<RequestToDelete>
            {
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app3", coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org2", "app3", coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "error", "blobstorageleaselockwritefail", coveredByUserId: coveredBy)
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org2", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org2", "app3", createdSuccessfully: true),
            };

            Dictionary<string, List<DelegationChange>> expectedDbUpdates = new Dictionary<string, List<DelegationChange>>
            {
                { "org1/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
                { "org2/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org2/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
            };

            // Act
            List<Rule> actual = await _pap.TryDeleteDelegationPolicies(inputRuleMatchess);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => r.CreatedSuccessfully));
            Assert.True(actual.All(r => !string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
            AssertionUtil.AssertEqual(expectedDbUpdates, _delegationMetadataRepositoryMock.MetadataChanges);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicies function, one rule are returned as failed due to error fetching data from DB
        /// Input:
        /// List of unordered rules for deletion of the same apps from the same OfferedBy to one CoveredBy user
        /// Expected Result:
        /// List of all rules deleted returned.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryDeleteDelegationPolicies_DBFetchFail()
        {
            // Arrange
            int performedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            int coveredBy = 20001337;
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;
            _delegationMetadataRepositoryMock.MetadataChanges = new Dictionary<string, List<DelegationChange>>();

            List<RequestToDelete> inputRuleMatchess = new List<RequestToDelete>
            {
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app3", coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org2", "app3", coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "error", "postgregetcurrentfail", coveredByUserId: coveredBy)
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org2", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org2", "app3", createdSuccessfully: true),
            };

            Dictionary<string, List<DelegationChange>> expectedDbUpdates = new Dictionary<string, List<DelegationChange>>
            {
                { "org1/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
                { "org2/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org2/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
            };

            // Act
            List<Rule> actual = await _pap.TryDeleteDelegationPolicies(inputRuleMatchess);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => r.CreatedSuccessfully));
            Assert.True(actual.All(r => !string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
            AssertionUtil.AssertEqual(expectedDbUpdates, _delegationMetadataRepositoryMock.MetadataChanges);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicies function, one rule are returned as failed due to error finding data on blob storage
        /// Input:
        /// List of unordered rules for deletion of the same apps from the same OfferedBy to one CoveredBy user
        /// Expected Result:
        /// List of all rules deleted returned.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryDeleteDelegationPolicies_PolicyPathDoesNotExist()
        {
            // Arrange
            int performedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            int coveredBy = 20001337;
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;
            _delegationMetadataRepositoryMock.MetadataChanges = new Dictionary<string, List<DelegationChange>>();

            List<RequestToDelete> inputRuleMatchess = new List<RequestToDelete>
            {
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app3", coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org2", "app3", coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app8", coveredByUserId: coveredBy)
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org2", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org2", "app3", createdSuccessfully: true),
            };

            Dictionary<string, List<DelegationChange>> expectedDbUpdates = new Dictionary<string, List<DelegationChange>>
            {
                { "org1/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
                { "org2/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org2/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
            };

            // Act
            List<Rule> actual = await _pap.TryDeleteDelegationPolicies(inputRuleMatchess);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => r.CreatedSuccessfully));
            Assert.True(actual.All(r => !string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
            AssertionUtil.AssertEqual(expectedDbUpdates, _delegationMetadataRepositoryMock.MetadataChanges);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicies function, one rule are returned as failed due to error updating data in DB
        /// Input:
        /// List of unordered rules for deletion of the same apps from the same OfferedBy to one CoveredBy user
        /// Expected Result:
        /// List of all rules deleted returned.
        /// Success Criteria:
        /// All returned rules match expected and have success flag and rule id set
        /// </summary>
        [Fact]
        public async Task TryDeleteDelegationPolicies_DBUpdateFails()
        {
            // Arrange
            int performedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            int coveredBy = 20001337;
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;
            _delegationMetadataRepositoryMock.MetadataChanges = new Dictionary<string, List<DelegationChange>>();

            List<RequestToDelete> inputRuleMatchess = new List<RequestToDelete>
            {
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org1", "app3", coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "org2", "app3", coveredByUserId: coveredBy),
                TestDataHelper.GetRequestToDeleteModel(performedByUserId, offeredByPartyId, "error", "postgrewritechangefail", coveredByUserId: coveredBy)
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org1", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Read", "org2", "app3", createdSuccessfully: true),
                TestDataHelper.GetRuleModel(performedByUserId, offeredByPartyId, coveredBy.ToString(), coveredByType, "Write", "org2", "app3", createdSuccessfully: true),
            };

            Dictionary<string, List<DelegationChange>> expectedDbUpdates = new Dictionary<string, List<DelegationChange>>
            {
                { "org1/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org1/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
                { "org2/app3/50001337/u20001337", new List<DelegationChange> { TestDataHelper.GetDelegationChange("org2/app3", offeredByPartyId, performedByUserId, coveredByUserId: coveredBy) } },
            };

            // Act
            List<Rule> actual = await _pap.TryDeleteDelegationPolicies(inputRuleMatchess);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => r.CreatedSuccessfully));
            Assert.True(actual.All(r => !string.IsNullOrEmpty(r.RuleId)));
            AssertionUtil.AssertEqual(expected, actual);
            AssertionUtil.AssertEqual(expectedDbUpdates, _delegationMetadataRepositoryMock.MetadataChanges);
        }

        /// <summary>
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
            _logger.Verify(
                x => x.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((@object, @type) => @object.ToString() == "No valid App policy found for delegation policy path: unknownorg/unknownapp/50001337/u20001337/delegationpolicy.xml" && @type.Name == "FormattedLogValues"),
                    It.IsAny<Exception>(),
                    (Func<It.IsAnyType, Exception, string>)It.IsAny<object>()),
                Times.Once);
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
            _logger.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((@object, @type) => @object.ToString().StartsWith("One or more rules could not be processed because of incomplete input:") && @type.Name == "FormattedLogValues"),
                    It.IsAny<Exception>(),
                    (Func<It.IsAnyType, Exception, string>)It.IsAny<object>()),
                Times.Once);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicyRules function, when blobLeaseClient.AcquireAsync throws exception when trying to get lease lock on delegation policy blob
        /// Input:
        /// Single rule
        /// Expected Result:
        /// The blob storage throws exception when aqcuiring lease lock
        /// Success Criteria:
        /// The blob storage exception is handled and logged. The rule is returned as not created.
        /// </summary>
        [Fact]
        public async Task TryWriteDelegationPolicyRules_Error_BlobStorageAqcuireLeaseLockException()
        {
            // Arrange
            int delegatedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            string coveredBy = "20001337";
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;

            List<Rule> unsortedRules = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "error", "error", "blobstoragegetleaselockfail"),
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "error", "error", "blobstoragegetleaselockfail", createdSuccessfully: false),
            };

            // Act
            List<Rule> actual = await _pap.TryWriteDelegationPolicyRules(unsortedRules);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => string.IsNullOrEmpty(r.RuleId)));
            Assert.True(actual.All(r => !r.CreatedSuccessfully));
            AssertionUtil.AssertEqual(expected, actual);
            _logger.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((@object, @type) => @object.ToString() == "Could not acquire blob lease lock on delegation policy at path: error/blobstoragegetleaselockfail/50001337/u20001337/delegationpolicy.xml" && @type.Name == "FormattedLogValues"),
                    It.IsAny<Exception>(),
                    (Func<It.IsAnyType, Exception, string>)It.IsAny<object>()),
                Times.Once);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicyRules function, when blob storage write throws exception caused by lease locking
        /// Input:
        /// Single rule
        /// Expected Result:
        /// The blob storage write throws exception
        /// Success Criteria:
        /// The blob storage exception is handled and logged. The rule is returned as not created.
        /// </summary>
        [Fact]
        public async Task TryWriteDelegationPolicyRules_Error_BlobStorageLeaseLockWriteException()
        {
            // Arrange
            int delegatedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            string coveredBy = "20001337";
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;

            List<Rule> unsortedRules = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "error", "error", "blobstorageleaselockwritefail"),
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "error", "error", "blobstorageleaselockwritefail", createdSuccessfully: false),
            };

            // Act
            List<Rule> actual = await _pap.TryWriteDelegationPolicyRules(unsortedRules);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => string.IsNullOrEmpty(r.RuleId)));
            Assert.True(actual.All(r => !r.CreatedSuccessfully));
            AssertionUtil.AssertEqual(expected, actual);
            _logger.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((@object, @type) => @object.ToString() == "An exception occured while processing authorization rules for delegation on delegation policy path: error/blobstorageleaselockwritefail/50001337/u20001337/delegationpolicy.xml" && @type.Name == "FormattedLogValues"),
                    It.IsAny<Exception>(),
                    (Func<It.IsAnyType, Exception, string>)It.IsAny<object>()),
                Times.Once);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicyRules function, when getting current delegation change from postgre fails
        /// Input:
        /// Single rule
        /// Expected Result:
        /// The postgre integration throws exception when getting the current change from the database
        /// Success Criteria:
        /// The postgre exception is handled and logged. The rule is returned as not created.
        /// </summary>
        [Fact]
        public async Task TryWriteDelegationPolicyRules_Error_PostgreGetCurrentException()
        {
            // Arrange
            int delegatedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            string coveredBy = "20001337";
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;

            List<Rule> unsortedRules = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "error", "error", "postgregetcurrentfail"),
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "error", "error", "postgregetcurrentfail", createdSuccessfully: false),
            };

            // Act
            List<Rule> actual = await _pap.TryWriteDelegationPolicyRules(unsortedRules);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => string.IsNullOrEmpty(r.RuleId)));
            Assert.True(actual.All(r => !r.CreatedSuccessfully));
            AssertionUtil.AssertEqual(expected, actual);
            _logger.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((@object, @type) => @object.ToString() == "An exception occured while processing authorization rules for delegation on delegation policy path: error/postgregetcurrentfail/50001337/u20001337/delegationpolicy.xml" && @type.Name == "FormattedLogValues"),
                    It.IsAny<Exception>(),
                    (Func<It.IsAnyType, Exception, string>)It.IsAny<object>()),
                Times.Once);
        }

        /// <summary>
        /// Scenario:
        /// Tests the TryWriteDelegationPolicyRules function, when writing the new current delegation change to postgre fails
        /// Input:
        /// Single rule
        /// Expected Result:
        /// The postgre integration throws exception when writing the new delegation change to the database
        /// Success Criteria:
        /// The postgre exception is handled and logged. The rule is returned as not created.
        /// </summary>
        [Fact]
        public async Task TryWriteDelegationPolicyRules_Error_PostgreWriteDelegationChangeException()
        {
            // Arrange
            int delegatedByUserId = 20001336;
            int offeredByPartyId = 50001337;
            string coveredBy = "20001337";
            string coveredByType = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;

            List<Rule> unsortedRules = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "error", "error", "postgrewritechangefail"),
            };

            List<Rule> expected = new List<Rule>
            {
                TestDataHelper.GetRuleModel(delegatedByUserId, offeredByPartyId, coveredBy, coveredByType, "error", "error", "postgrewritechangefail", createdSuccessfully: false),
            };

            // Act
            List<Rule> actual = await _pap.TryWriteDelegationPolicyRules(unsortedRules);

            // Assert
            Assert.Equal(expected.Count, actual.Count);
            Assert.True(actual.All(r => string.IsNullOrEmpty(r.RuleId)));
            Assert.True(actual.All(r => !r.CreatedSuccessfully));
            AssertionUtil.AssertEqual(expected, actual);
            _logger.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((@object, @type) => @object.ToString() == "Writing of delegation change to authorization postgresql database failed for changes to delegation policy at path: error/postgrewritechangefail/50001337/u20001337/delegationpolicy.xml" && @type.Name == "FormattedLogValues"),
                    It.IsAny<Exception>(),
                    (Func<It.IsAnyType, Exception, string>)It.IsAny<object>()),
                Times.Once);
        }
    }
}
