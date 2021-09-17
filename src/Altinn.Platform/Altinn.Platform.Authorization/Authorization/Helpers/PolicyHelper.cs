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
                                if (xacmlMatch.AttributeDesignator.AttributeId.Equals(AltinnXacmlConstants.MatchAttributeIdentifiers.RoleAttribute))
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
                        if (asd.AttributeId.OriginalString.Equals(AltinnXacmlConstants.MatchAttributeIdentifiers.OrgAttribute))
                        {
                            org = asd.AttributeValues.FirstOrDefault().Value;
                        }

                        if (asd.AttributeId.OriginalString.Equals(AltinnXacmlConstants.MatchAttributeIdentifiers.AppAttribute))
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
            if (string.IsNullOrWhiteSpace(org))
            {
                throw new ArgumentException("Org was not defined");
            }

            if (string.IsNullOrWhiteSpace(app))
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
            if (string.IsNullOrWhiteSpace(org))
            {
                throw new ArgumentException("Org was not defined");
            }

            if (string.IsNullOrWhiteSpace(app))
            {
                throw new ArgumentException("App was not defined");
            }

            if (string.IsNullOrWhiteSpace(offeredBy))
            {
                throw new ArgumentException("OfferedBy was not defined");
            }

            if (string.IsNullOrWhiteSpace(coveredBy))
            {
                throw new ArgumentException("CoveredBy was not defined");
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
        /// Builds a XacmlPolicy representation based on the DelegationPolicy input
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyId">The party of the entity having received the delegated policy, if the receiving entity is an organization</param>
        /// <param name="coveredByUserId">The user id of the entity having received the delegated policy, if the receiving entity is a user</param>
        /// <param name="rules">The set of rules to be delegated</param>
        /// <param name="appPolicy">The original app policy</param>
        public static XacmlPolicy BuildDelegationPolicy(string org, string app, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId, IList<Rule> rules, XacmlPolicy appPolicy)
        {
            XacmlPolicy delegationPolicy = new XacmlPolicy(new Uri($"{AltinnXacmlConstants.Prefixes.PolicyId}{1}"), new Uri(XacmlConstants.CombiningAlgorithms.PolicyDenyOverrides), new XacmlTarget(new List<XacmlAnyOf>()));
            delegationPolicy.Version = "1.0";

            string coveredBy = coveredByPartyId.HasValue ? coveredByPartyId.Value.ToString() : coveredByUserId.Value.ToString();
            delegationPolicy.Description = $"Delegation policy containing all delegated rights/actions from {offeredByPartyId} to {coveredBy}, for resources on the app; {org}/{app}";

            foreach (Rule rule in rules)
            {
                delegationPolicy.Rules.Add(BuildDelegationRule(org, app, offeredByPartyId, coveredByPartyId, coveredByUserId, rule, appPolicy));
            }

            foreach (XacmlObligationExpression obligation in appPolicy.ObligationExpressions)
            {
                delegationPolicy.ObligationExpressions.Add(obligation);
            }

            return delegationPolicy;
        }

        /// <summary>
        /// Builds a XacmlRule representation based on the Rule input
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyId">The party of the entity having received the delegated policy, if the receiving entity is an organization</param>
        /// <param name="coveredByUserId">The user id of the entity having received the delegated policy, if the receiving entity is a user</param>
        /// <param name="rule">The rule to be delegated</param>
        /// <param name="appPolicy">The original app policy</param>
        public static XacmlRule BuildDelegationRule(string org, string app, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId, Rule rule, XacmlPolicy appPolicy)
        {
            rule.RuleId = Guid.NewGuid().ToString();
            
            string coveredBy = coveredByPartyId.HasValue ? coveredByPartyId.Value.ToString() : coveredByUserId.Value.ToString();
            XacmlRule delegationRule = new XacmlRule($"{AltinnXacmlConstants.Prefixes.RuleId}{rule.RuleId}", XacmlEffectType.Permit)
            {
                Description = $"Delegation of a right/action from {offeredByPartyId} to {coveredBy}, for a resource on the app; {org}/{app}, by user; {rule.DelegatedByUserId}"
            };

            delegationRule.Target = BuildDelegationRuleTarget(org, app, offeredByPartyId, coveredByPartyId, coveredByUserId, rule, appPolicy);
            
            return delegationRule;
        }

        /// <summary>
        /// Builds a XacmlTarget representation based on the Rule input
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app</param>
        /// <param name="app">Application identifier which is unique within an organisation</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyId">The party of the entity having received the delegated policy, if the receiving entity is an organization</param>
        /// <param name="coveredByUserId">The user id of the entity having received the delegated policy, if the receiving entity is a user</param>
        /// <param name="rule">The set of rule to be delegated</param>
        /// <param name="appPolicy">The original app policy</param>
        public static XacmlTarget BuildDelegationRuleTarget(string org, string app, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId, Rule rule, XacmlPolicy appPolicy)
        {
            List<XacmlAnyOf> targetList = new List<XacmlAnyOf>();

            // Build Subject
            List<XacmlAllOf> subjectAllOfs = new List<XacmlAllOf>();
            if (coveredByUserId.HasValue)
            {
                subjectAllOfs.Add(new XacmlAllOf(new List<XacmlMatch>
                {
                    new XacmlMatch(
                        new Uri(XacmlConstants.AttributeMatchFunction.StringEqual),
                        new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), coveredByUserId.Value.ToString()),
                        new XacmlAttributeDesignator(new Uri(XacmlConstants.MatchAttributeCategory.Subject), new Uri(AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute), new Uri(XacmlConstants.DataTypes.XMLString), false))
                }));
            }
            else
            {
                subjectAllOfs.Add(new XacmlAllOf(new List<XacmlMatch>
                {
                    new XacmlMatch(
                        new Uri(XacmlConstants.AttributeMatchFunction.StringEqual),
                        new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), coveredByPartyId.Value.ToString()),
                        new XacmlAttributeDesignator(new Uri(XacmlConstants.MatchAttributeIdentifiers.SubjectId), new Uri(AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute), new Uri(XacmlConstants.DataTypes.XMLString), false))
                }));
            }

            // Build Resource
            List<XacmlMatch> resourceMatches = new List<XacmlMatch>();
            foreach (AttributeMatch resourceMatch in rule.Resource)
            {
                resourceMatches.Add(
                    new XacmlMatch(
                        new Uri(XacmlConstants.AttributeMatchFunction.StringEqual),
                        new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), resourceMatch.Value),
                        new XacmlAttributeDesignator(new Uri(XacmlConstants.MatchAttributeCategory.Resource), new Uri(resourceMatch.Id), new Uri(XacmlConstants.DataTypes.XMLString), false)));
            }

            List<XacmlAllOf> resourceAllOfs = new List<XacmlAllOf> { new XacmlAllOf(resourceMatches) };

            // Build Action
            List<XacmlAllOf> actionAllOfs = new List<XacmlAllOf>();
            actionAllOfs.Add(new XacmlAllOf(new List<XacmlMatch>
            {
                new XacmlMatch(
                        new Uri(XacmlConstants.AttributeMatchFunction.StringEqual),
                        new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), rule.Action.Value),
                        new XacmlAttributeDesignator(new Uri(XacmlConstants.MatchAttributeCategory.Action), new Uri(XacmlConstants.MatchAttributeIdentifiers.ActionId), new Uri(XacmlConstants.DataTypes.XMLString), false))
            }));

            targetList.Add(new XacmlAnyOf(subjectAllOfs));
            targetList.Add(new XacmlAnyOf(resourceAllOfs));
            targetList.Add(new XacmlAnyOf(actionAllOfs));

            return new XacmlTarget(targetList);
        }

        /// <summary>
        /// Builds a XacmlMatch model
        /// </summary>
        /// <param name="function">The compare function type</param>
        /// <param name="datatype">The attribute data type</param>
        /// <param name="attributeValue">The attribute value</param>
        /// <param name="attributeId">The attribute id</param>
        /// <param name="category">The attribute category</param>
        /// <param name="mustBePresent">Whether the attribute value must be present</param>
        public static XacmlMatch BuildDelegationPolicyMatch(string function, string datatype, string attributeValue, string attributeId, string category, bool mustBePresent = false)
        {
            return new XacmlMatch(
                new Uri(function),
                new XacmlAttributeValue(new Uri(datatype), attributeValue),
                new XacmlAttributeDesignator(new Uri(category), new Uri(attributeId), new Uri(datatype), mustBePresent));
        }
    }
}
