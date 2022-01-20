using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.IntegrationTests.Data;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    public class PolicyInformationPointMock : IPolicyInformationPoint
    {
        private readonly IDelegationMetadataRepository _delegationRepository;

        public PolicyInformationPointMock(IDelegationMetadataRepository delegationRepository)
        {
            _delegationRepository = delegationRepository;
        }

        public async Task<List<Rule>> GetRulesAsync(List<string> appIds, List<int> offeredByPartyIds, List<int> coveredByPartyIds, List<int> coveredByUserIds)
        {
            List<Rule> rulesList = new List<Rule>();
            List<DelegationChange> delegationChanges = await _delegationRepository.GetAllCurrentDelegationChanges(appIds, offeredByPartyIds, coveredByPartyIds, coveredByUserIds);
            foreach (DelegationChange change in delegationChanges)
            {
                if (change.AltinnAppId == "SKD/TaxReport" && change.OfferedByPartyId == 50001337 && change.CoveredByUserId == 20001336)
                {
                    rulesList.Add(TestDataHelper.GetRuleModel(change.PerformedByUserId, change.OfferedByPartyId, change.CoveredByUserId.ToString(), AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Read", "SKD", "TaxReport"));
                    rulesList.Add(TestDataHelper.GetRuleModel(change.PerformedByUserId, change.OfferedByPartyId, change.CoveredByUserId.ToString(), AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute, "Write", "SKD", "TaxReport"));
                }

                if (change.AltinnAppId == "SKD/TaxReport" && change.OfferedByPartyId == 50001337 && change.CoveredByPartyId == 50001336)
                {
                    rulesList.Add(TestDataHelper.GetRuleModel(change.PerformedByUserId, change.OfferedByPartyId, change.CoveredByPartyId.ToString(), AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute, "Sign", "SKD", "TaxReport"));
                }

                if (change.AltinnAppId == "SKD/TaxReport" && change.OfferedByPartyId == 50001337 && change.CoveredByPartyId == 50001337)
                {
                    rulesList.Add(TestDataHelper.GetRuleModel(change.PerformedByUserId, change.OfferedByPartyId, change.CoveredByPartyId.ToString(), AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute, "Sign", "SKD", "TaxReport"));
                }
            }

            return rulesList;
        }
    }
}
