using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.Models;

namespace Altinn.Platform.Authorization.Helpers
{
    /// <summary>
    /// Delegation helper methods
    /// </summary>
    public static class DelegationHelper
    {
        /// <summary>
        /// Sort rules for delegation by delegation policy file path, i.e. Org/App/OfferedBy/CoveredBy
        /// </summary>
        /// <param name="rules">The list of rules to be sorted</param>
        /// <param name="unsortableRules">The list of rules not able to sort by org/app/offeredBy/CoveredBy</param>
        /// <returns>A dictionary with key being the filepath for the delegation policy file, and value being the list of rules to be written to the delegation policy</returns>
        public static Dictionary<string, List<Rule>> SortRulesByDelegationPolicyPath(List<Rule> rules, out List<Rule> unsortableRules)
        {
            Dictionary<string, List<Rule>> result = new Dictionary<string, List<Rule>>();
            unsortableRules = new List<Rule>();

            foreach (Rule rule in rules)
            {
                if (!TryGetDelegationPolicyPathFromRule(rule, out string path))
                {
                    unsortableRules.Add(rule);
                    continue;
                }

                if (result.ContainsKey(path))
                {
                    result[path].Add(rule);
                }
                else
                {
                    result.Add(path, new List<Rule> { rule });
                }
            }

            return result;
        }

        /// <summary>
        /// Gets a string representation of the CoveredByPartyId
        /// </summary>
        /// <returns>The CoveredByPartyId value</returns>
        public static bool TryGetCoveredByPartyIdFromMatch(List<AttributeMatch> match, out int coveredByPartyId)
        {
            coveredByPartyId = 0;
            if (match?.Count == 1 && match.First().Id == AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute && int.TryParse(match.First().Value, out coveredByPartyId))
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Gets a string representation of the CoveredByUserId
        /// </summary>
        /// <returns>The CoveredByUserId value</returns>
        public static bool TryGetCoveredByUserIdFromMatch(List<AttributeMatch> match, out int coveredByUserId)
        {
            coveredByUserId = 0;
            if (match?.Count == 1 && match.First().Id == AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute && int.TryParse(match.First().Value, out coveredByUserId))
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Gets Org, App, OfferedBy and CoveredBy as out params from a single Rule
        /// </summary>
        /// <returns>A bool indicating whether params where found</returns>
        public static bool TryGetDelegationParamsFromRule(Rule rule, out string org, out string app, out int offeredByPartyId, out int? coveredByPartyId, out int? coveredByUserId, out int delegatedByUserId)
        {
            org = null;
            app = null;
            offeredByPartyId = 0;
            coveredByPartyId = null;
            coveredByUserId = null;
            delegatedByUserId = 0;

            try
            {
                org = rule.Resource.First(rm => rm.Id == AltinnXacmlConstants.MatchAttributeIdentifiers.OrgAttribute)?.Value;
                app = rule.Resource.First(rm => rm.Id == AltinnXacmlConstants.MatchAttributeIdentifiers.AppAttribute)?.Value;
                offeredByPartyId = rule.OfferedByPartyId;
                coveredByPartyId = TryGetCoveredByPartyIdFromMatch(rule.CoveredBy, out int coveredByParty) ? coveredByParty : null;
                coveredByUserId = TryGetCoveredByUserIdFromMatch(rule.CoveredBy, out int coveredByUser) ? coveredByUser : null;
                delegatedByUserId = rule.DelegatedByUserId;

                if (!string.IsNullOrWhiteSpace(org) && !string.IsNullOrWhiteSpace(app) && offeredByPartyId != 0 && (coveredByPartyId.HasValue || coveredByUserId.HasValue))
                {
                    return true;
                }
            }
            catch (Exception)
            {
                // Todo logging?
            }

            return false;
        }

        /// <summary>
        /// Gets the delegation policy path for a single Rule
        /// </summary>
        /// <returns>A bool indicating whether necessary params to build the path where found</returns>
        public static bool TryGetDelegationPolicyPathFromRule(Rule rule, out string delegationPolicyPath)
        {
            delegationPolicyPath = null;
            try
            {
                if (TryGetDelegationParamsFromRule(rule, out string org, out string app, out int offeredBy, out int? coveredByPartyId, out int? coveredByUserId, out _))
                {
                    delegationPolicyPath = PolicyHelper.GetAltinnAppDelegationPolicyPath(org, app, offeredBy.ToString(), coveredByPartyId?.ToString() ?? coveredByUserId?.ToString());
                    return true;
                }                
            }
            catch (Exception)
            {
                // Todo logging
            }

            return false;
        }

        /// <summary>
        /// Checks whether the provided XacmlPolicy contains a rule matching on both Resource signature and Action from the rule
        /// </summary>
        /// <returns>A bool</returns>
        public static bool PolicyContainsMatchingRule(XacmlPolicy policy, Rule rule)
        {
            string ruleResourceKey = GetResourceKeyFromRule(rule);
            foreach (XacmlRule policyRule in policy.Rules)
            {
                if (!policyRule.Effect.Equals(XacmlEffectType.Permit) || policyRule.Target == null)
                {
                    continue;
                }

                List<string> resourceKeys = new List<string>();
                bool matchingActionFound = false;
                foreach (XacmlAnyOf anyOf in policyRule.Target.AnyOf)
                {
                    foreach (XacmlAllOf allOf in anyOf.AllOf)
                    {
                        string resourceKey = string.Empty;
                        foreach (XacmlMatch xacmlMatch in allOf.Matches)
                        {
                            if (xacmlMatch.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Resource))
                            {
                                resourceKey += xacmlMatch.AttributeDesignator.AttributeId.OriginalString + xacmlMatch.AttributeValue.Value;
                            }
                            else if (xacmlMatch.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Action) &&
                                xacmlMatch.AttributeDesignator.AttributeId.OriginalString == rule.Action.Id &&
                                xacmlMatch.AttributeValue.Value == rule.Action.Value)
                            {
                                matchingActionFound = true;
                            }
                        }

                        if (!string.IsNullOrEmpty(resourceKey))
                        {
                            resourceKeys.Add(resourceKey);
                        }
                    }
                }

                if (resourceKeys.Contains(ruleResourceKey) && matchingActionFound)
                {
                    int guidIndex = policyRule.RuleId.IndexOf(AltinnXacmlConstants.Prefixes.RuleId);
                    rule.RuleId = policyRule.RuleId.Substring(guidIndex + AltinnXacmlConstants.Prefixes.RuleId.Length);
                    return true;
                }
            }

            return false;
        }

        /// <summary>
        /// Gets a string key representing the resource of a rule
        /// </summary>
        /// <returns>A bool</returns>
        public static string GetResourceKeyFromRule(Rule rule)
        {
            return string.Concat(rule.Resource.Select(r => r.Id + r.Value));
        }
    }
}
