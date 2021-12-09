using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// The Policy Information Point responsible for storing and modifying delegation policies
    /// </summary>
    public class PolicyInformationPoint : IPolicyInformationPoint
    {
        private readonly IPolicyRetrievalPoint _prp;
        private readonly IDelegationMetadataRepository _delegationRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyAdministrationPoint"/> class.
        /// </summary>
        /// <param name="policyRetrievalPoint">The policy retrieval point</param>
        /// <param name="policyRepository">The policy repository</param>
        /// <param name="delegationRepository">The delegation change repository</param>
        /// <param name="memoryCache">The cache handler</param>
        /// <param name="settings">The app settings</param>
        public PolicyInformationPoint(IPolicyRetrievalPoint policyRetrievalPoint, IPolicyRepository policyRepository, IDelegationMetadataRepository delegationRepository, IMemoryCache memoryCache, IOptions<GeneralSettings> settings)
        {
            _prp = policyRetrievalPoint;
            _delegationRepository = delegationRepository;
        }

        /// <inheritdoc/>
        public async Task<List<Rule>> GetRulesAsync(List<string> orgApp, List<int> offeredByPartyIds, List<int> coveredByPartyIds, List<int> coveredByUserIds)
        {
            List<Rule> rules = new List<Rule>();
            List<DelegationChange> delegationChanges = await _delegationRepository.GetAllCurrentDelegationChanges(orgApp, offeredByPartyIds, coveredByPartyIds, coveredByUserIds);
            foreach (DelegationChange delegationChange in delegationChanges)
            {
                XacmlPolicy policy = await _prp.GetPolicyVersionAsync(delegationChange.BlobStoragePolicyPath, delegationChange.BlobStorageVersionId);
                rules.AddRange(GetRulesFromPolicyAndDelegationChange(policy.Rules, delegationChange));
            }

            return rules;
        }

        private static List<Rule> GetRulesFromPolicyAndDelegationChange(ICollection<XacmlRule> xacmlRules, DelegationChange delegationChange)
        {
            List<Rule> rules = new List<Rule>();
            foreach (XacmlRule xacmlRule in xacmlRules)
            {
                if (xacmlRule.Effect.Equals(XacmlEffectType.Permit) && xacmlRule.Target != null)
                {
                    Rule rule = new Rule
                    {
                        RuleId = xacmlRule.RuleId,
                        OfferedByPartyId = delegationChange.OfferedByPartyId,
                        DelegatedByUserId = delegationChange.PerformedByUserId,
                        CoveredBy = new List<AttributeMatch>(),
                        Resource = new List<AttributeMatch>()
                    };
                    AddAttributeMatchesToRule(xacmlRule.Target, rule);
                    rules.Add(rule);
                }
            }

            return rules;
        }

        private static void AddAttributeMatchesToRule(XacmlTarget xacmlTarget, Rule rule)
        {
            foreach (XacmlAnyOf anyOf in xacmlTarget.AnyOf)
            {
                foreach (XacmlAllOf allOf in anyOf.AllOf)
                {
                    foreach (XacmlMatch xacmlMatch in allOf.Matches)
                    {
                        AddAttributeMatchToRule(xacmlMatch, rule);
                    }
                }
            }
        }

        private static void AddAttributeMatchToRule(XacmlMatch xacmlMatch, Rule rule)
        {
            if (xacmlMatch.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Action))
            {
                rule.Action = new AttributeMatch
                {
                    Id = xacmlMatch.AttributeDesignator.AttributeId.OriginalString,
                    Value = xacmlMatch.AttributeValue.Value
                };
            }

            if (xacmlMatch.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Subject))
            {
                rule.CoveredBy.Add(new AttributeMatch
                {
                    Id = xacmlMatch.AttributeDesignator.AttributeId.OriginalString,
                    Value = xacmlMatch.AttributeValue.Value
                });
            }

            if (xacmlMatch.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Resource))
            {
                rule.Resource.Add(new AttributeMatch
                {
                    Id = xacmlMatch.AttributeDesignator.AttributeId.OriginalString,
                    Value = xacmlMatch.AttributeValue.Value
                });
            }
        }
    }
}
