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
    /// Policy helper methods
    /// </summary>
    public static class PolicyHelper
    {
        private static string orgAttributeId = "urn:altinn:org";
        private static string appAttributeId = "urn:altinn:app";

        /// <summary>
        /// Extracts a list of all roles codes mentioned in a permit rule in a policy. 
        /// </summary>
        /// <param name="policy">The policy</param>
        /// <returns>List of role codes</returns>
        public static List<string> GetRolesWithAccess(XacmlPolicy policy)
        {
            HashSet<string> roleCodes = new HashSet<string>();

            foreach (XacmlRule rule in policy.Rules)
            {
                if (rule.Effect.Equals(XacmlEffectType.Permit) && rule.Target != null)
                {
                    foreach (XacmlAnyOf anyOf in rule.Target.AnyOf)
                    {
                        foreach (XacmlAllOf allOf in anyOf.AllOf)
                        {
                            foreach (XacmlMatch xacmlMatch in allOf.Matches)
                            {
                                if (xacmlMatch.AttributeDesignator.AttributeId.Equals(XacmlRequestAttribute.RoleAttribute))
                                {
                                    roleCodes.Add(xacmlMatch.AttributeValue.Value);
                                }
                            }
                        }
                    }
                }
            }

            return roleCodes.ToList();
        }

        /// <summary>
        /// Finds the correct policy path based on a XacmlContextRequest
        /// </summary>
        /// <param name="request">Xacml context request to use for finding the org and app for building the path</param>
        /// <returns></returns>
        public static string GetPolicyPath(XacmlContextRequest request)
        {
            string org = string.Empty;
            string app = string.Empty;

            foreach (XacmlContextAttributes attr in request.Attributes)
            {
                if (attr.Category.OriginalString.Equals(XacmlConstants.MatchAttributeCategory.Resource))
                {
                    foreach (XacmlAttribute asd in attr.Attributes)
                    {
                        if (asd.AttributeId.OriginalString.Equals(orgAttributeId))
                        {
                            org = asd.AttributeValues.FirstOrDefault().Value;
                        }

                        if (asd.AttributeId.OriginalString.Equals(appAttributeId))
                        {
                            app = asd.AttributeValues.FirstOrDefault().Value;
                        }
                    }
                }
            }

            return GetAltinnAppsPolicyPath(org, app);
        }

        /// <summary>
        /// Builds the policy path based on org and app names
        /// </summary>
        /// <param name="org">The organization name/identifier</param>
        /// <param name="app">The altinn app name</param>
        /// <returns></returns>
        public static string GetAltinnAppsPolicyPath(string org, string app)
        {
            if (string.IsNullOrEmpty(org))
            {
                throw new ArgumentException("Org was not defined");
            }

            if (string.IsNullOrEmpty(app))
            {
                throw new ArgumentException("App was not defined");
            }

            return $"{org.AsFileName()}/{app.AsFileName()}/policy.xml";
        }

        /// <summary>
        /// Builds the delegation policy path based on org and app names, as well as identifiers for the delegating and receiving entities
        /// </summary>
        /// <param name="org">The organization name/identifier</param>
        /// <param name="app">The altinn app name</param>
        /// <param name="offeredBy">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredBy">The party or user id of the entity having received the delegated policy</param>
        /// <returns></returns>
        public static string GetAltinnAppDelegationPolicyPath(string org, string app, string offeredBy, string coveredBy)
        {
            if (string.IsNullOrEmpty(org))
            {
                throw new ArgumentException("Org was not defined");
            }

            if (string.IsNullOrEmpty(app))
            {
                throw new ArgumentException("App was not defined");
            }

            if (string.IsNullOrEmpty(offeredBy))
            {
                throw new ArgumentException("offeredBy was not defined");
            }

            if (string.IsNullOrEmpty(coveredBy))
            {
                throw new ArgumentException("coveredBy was not defined");
            }

            return $"{org.AsFileName()}/{app.AsFileName()}/{offeredBy.AsFileName()}/{coveredBy.AsFileName()}/delegationpolicy.xml";
        }

        /// <summary>
        /// Takes the file IO stream and parses the policy file to a XacmlPolicy
        /// </summary>
        /// <param name="stream">The file IO stream</param>
        /// <returns>XacmlPolicy</returns>
        public static XacmlPolicy ParsePolicy(Stream stream)
        {
            stream.Position = 0;
            XacmlPolicy policy;
            using (XmlReader reader = XmlReader.Create(stream))
            {
                policy = XacmlParser.ParseXacmlPolicy(reader);
            }

            return policy;
        }

        /// <summary>
        /// Parsing the CoveredBy input property to either a CoveredByPartyId or CoveredByUserId based on prefix 'u' for userId and 'p' for party
        /// </summary>
        /// <param name="coveredBy">The input value to be parsed</param>
        /// <param name="coveredByPartyId">Output value for PartyId. 0 if input is not a party</param>
        /// <param name="coveredByUserId">Output value for UserId. 0 if input is not a user</param>
        /// <returns>List of role codes</returns>
        public static bool TryParseCoveredBy(string coveredBy, out int coveredByPartyId, out int coveredByUserId)
        {
            coveredByPartyId = 0;
            coveredByUserId = 0;

            if (string.IsNullOrEmpty(coveredBy))
            {
                return false;
            }

            if (coveredBy.StartsWith("u") && int.TryParse(coveredBy[1..], out coveredByUserId))
            {
                return true;
            }
            else if (coveredBy.StartsWith("p") && int.TryParse(coveredBy[1..], out coveredByPartyId))
            {
                return true;
            }

            return false;
        }

        /// <summary>
        /// Builds a XacmlPolicy representation based on the DelegationPolicy input
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredBy">The party or user id of the entity having received the delegated policy</param>
        /// <param name="delegatedByUserId">The user id of the entity performing the delegation of the policy</param>
        /// <param name="rules">The set of rules to be delegated</param>
        public static XacmlPolicy BuildDelegationPolicy(string org, string app, int offeredByPartyId, string coveredBy, int delegatedByUserId, IList<Rule> rules)
        {
            throw new NotImplementedException();
        }
    }
}
