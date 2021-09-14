using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Xml;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.Helpers.Extensions;
using Altinn.Platform.Authorization.Models;

namespace Altinn.Platform.Authorization.Helpers
{
    /// <summary>
    /// Delegation helper methods
    /// </summary>
    public static class DelegationHelper
    {
        private static string orgAttributeId = "urn:altinn:org";
        private static string appAttributeId = "urn:altinn:app";
        private static string taskAttributeId = "urn:altinn:task";
        private static string eventAttributeId = "urn:altinn:event";
        private static string userIdAttributeId = "urn:altinn:userid";
        private static string partyIdAttributeId = "urn:altinn:partyid";

        /// <summary>
        /// Sort rules for delegation by delegation policy file path, i.e. Org/App/OfferedBy/CoveredBy
        /// </summary>
        /// <param name="rules">The list of rules to be sorted</param>
        /// <returns>A dictionary with key being the filepath for the delegation policy file, and value being the list of rules to be written to the delegation policy</returns>
        public static Dictionary<string, List<Rule>> SortRulesByDelegationPolicyPath(IList<Rule> rules)
        {
            Dictionary<string, List<Rule>> result = new Dictionary<string, List<Rule>>();

            foreach (Rule rule in rules)
            {
                if (!TryGetDelegationPolicyPathFromRule(rule, out string path))
                {
                    // Todo: should we just ignore these rules? Or stop processing the entire set or just this app?
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
            if (match?.Count == 1 && match.First().Id == partyIdAttributeId && int.TryParse(match.First().Value, out coveredByPartyId))
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
            if (match?.Count == 1 && match.First().Id == userIdAttributeId && int.TryParse(match.First().Value, out coveredByUserId))
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
                org = rule.Resource.First(rm => rm.Id == orgAttributeId)?.Value;
                app = rule.Resource.First(rm => rm.Id == appAttributeId)?.Value;
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
                // Todo logging
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
    }
}
