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
        /// Gets a int representation of the CoveredByUserId and CoverdByPartyId from an AttributeMatch list.
        /// This works under the asumptions that any valid search for å valid policy contains a CoveredBy and this must be in the form
        /// of a PartyId or a UserId. So any valid search containing a PartyId should not contain a USerId and vice versa.
        /// If the search does not contain any of those this should be considered as an invalid search.
        /// </summary>
        /// <param name="match">the list to fetch coveredBy from</param>
        /// <param name="coveredByUserId">The value for coveredByUserId or null if not present</param>
        /// <param name="coveredByPartyId">The value for coveredByPartyId or null if not present</param>
        /// <returns>The CoveredByUserId or CoveredByPartyId in the input AttributeMatch list as a string primarly used to create a policypath for fetching a delegated policy file.</returns>
        public static string GetCoveredByFromMatch(List<AttributeMatch> match, out int? coveredByUserId, out int? coveredByPartyId)
        {
            bool validUser = TryGetCoveredByUserIdFromMatch(match, out int coveredByUserIdTemp);
            bool validParty = TryGetCoveredByPartyIdFromMatch(match, out int coveredByPartyIdTemp);
            coveredByPartyId = validParty ? coveredByPartyIdTemp : null;
            coveredByUserId = validUser ? coveredByUserIdTemp : null;

            if (validUser)
            {
                return coveredByUserIdTemp.ToString();
            }
            else if (validParty)
            {
                return coveredByPartyIdTemp.ToString();
            }
            else
            {
                return null;
            }
        }

        /// <summary>
        /// Gets Org and App as out params from a single Resource
        /// </summary>
        /// <param name="input">The resource to fetch org and app from</param>
        /// <param name="org">the org part of the resource</param>
        /// <param name="app">the app part of the resource</param>
        /// <returns>A bool indicating whether params where found</returns>
        public static bool TryGetResourceFromAttributeMatch(List<AttributeMatch> input, out string org, out string app)
        {
            org = input.FirstOrDefault(am => am.Id == AltinnXacmlConstants.MatchAttributeIdentifiers.OrgAttribute)?.Value;
            app = input.FirstOrDefault(am => am.Id == AltinnXacmlConstants.MatchAttributeIdentifiers.AppAttribute)?.Value;

            if (!string.IsNullOrWhiteSpace(org) && !string.IsNullOrWhiteSpace(app))
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
                // Any exceptions here are caused by invalid input which should be handled and logged by the calling entity
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
            if (TryGetDelegationParamsFromRule(rule, out string org, out string app, out int offeredBy, out int? coveredByPartyId, out int? coveredByUserId, out _))
            {
                delegationPolicyPath = PolicyHelper.GetAltinnAppDelegationPolicyPath(org, app, offeredBy.ToString(), coveredByUserId, coveredByPartyId);
                return true;
            }

            return false;
        }

        /// <summary>
        /// Returns the count of unique Policies in a list of Rules
        /// </summary>
        /// <param name="rules">List of rules to check how many individual policies exist</param>
        /// <returns>count of policies</returns>
        public static int GetPolicyCount(List<Rule> rules)
        {
            List<string> policyPaths = new List<string>();
            foreach (Rule rule in rules)
            {
                bool pathOk = DelegationHelper.TryGetDelegationPolicyPathFromRule(rule, out string delegationPolicyPath);
                if (pathOk && !policyPaths.Contains(delegationPolicyPath))
                {
                    policyPaths.Add(delegationPolicyPath);
                }
            }

            return policyPaths.Count;
        }

        /// <summary>
        /// Returns the count of unique ruleids in a list dele
        /// </summary>
        /// <param name="rulesToDelete">List of rules and policies to check how many individual ruleids exist</param>
        /// <returns>count of rules</returns>
        public static int GetRulesCountToDeleteFromRequestToDelete(List<RequestToDelete> rulesToDelete)
        {
            int result = 0;
            foreach (RequestToDelete ruleToDelete in rulesToDelete)
            {
                result += ruleToDelete.RuleIds.Count;
            }

            return result;
        }

        /// <summary>
        /// Checks whether the provided XacmlPolicy contains a rule having an identical Resource signature and contains the Action from the rule,
        /// to be used for checking for duplicate rules in delegation.
        /// </summary>
        /// <returns>A bool</returns>
        public static bool PolicyContainsMatchingRule(XacmlPolicy policy, Rule rule)
        {
            string ruleResourceKey = GetAttributeMatchKey(rule.Resource);
            
            foreach (XacmlRule policyRule in policy.Rules)
            {
                if (!policyRule.Effect.Equals(XacmlEffectType.Permit) || policyRule.Target == null)
                {
                    continue;
                }

                List<List<AttributeMatch>> policyResourceMatches = new List<List<AttributeMatch>>();
                bool matchingActionFound = false;
                foreach (XacmlAnyOf anyOf in policyRule.Target.AnyOf)
                {
                    foreach (XacmlAllOf allOf in anyOf.AllOf)
                    {
                        List<AttributeMatch> resourceMatch = new List<AttributeMatch>();
                        foreach (XacmlMatch xacmlMatch in allOf.Matches)
                        {
                            if (xacmlMatch.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Resource))
                            {
                                resourceMatch.Add(new AttributeMatch { Id = xacmlMatch.AttributeDesignator.AttributeId.OriginalString, Value = xacmlMatch.AttributeValue.Value });
                            }
                            else if (xacmlMatch.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Action) &&
                                xacmlMatch.AttributeDesignator.AttributeId.OriginalString == rule.Action.Id &&
                                xacmlMatch.AttributeValue.Value == rule.Action.Value)
                            {
                                matchingActionFound = true;
                            }
                        }

                        if (resourceMatch.Any())
                        {
                            policyResourceMatches.Add(resourceMatch);
                        }
                    }
                }

                if (policyResourceMatches.Any(resourceMatch => GetAttributeMatchKey(resourceMatch) == ruleResourceKey) && matchingActionFound)
                {
                    rule.RuleId = policyRule.RuleId;
                    return true;
                }
            }

            return false;
        }

        /// <summary>
        /// Gets a string key representing the a list of attributematches
        /// </summary>
        /// <returns>A key string</returns>
        public static string GetAttributeMatchKey(List<AttributeMatch> attributeMatches)
        {
            return string.Concat(attributeMatches.OrderBy(r => r.Id).Select(r => r.Id + r.Value));
        }
    }
}
