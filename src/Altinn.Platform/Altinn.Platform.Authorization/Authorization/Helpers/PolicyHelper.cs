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
        /// <param name="rules">The set of rules to be delegated</param>
        public static XacmlPolicy BuildDelegationPolicy(string org, string app, int offeredByPartyId, string coveredBy, IList<Rule> rules)
        {
            XacmlPolicy delegationPolicy = new XacmlPolicy(new Uri("urn:altinn:example:policyid:1"), new Uri("urn:oasis:names:tc:xacml:3.0:rule-combining-algorithm:deny-overrides"), new XacmlTarget(new List<XacmlAnyOf>()));
            delegationPolicy.Version = "1.0";

            foreach (Rule rule in rules)
            {
                delegationPolicy.Rules.Add(BuildDelegationRule(org, app, offeredByPartyId, coveredBy, rule));
            }

            delegationPolicy.ObligationExpressions.Add(BuildDelegationPolicyObligationExpression("2"));

            return delegationPolicy;
        }

        /// <summary>
        /// Builds a XacmlRule representation based on the Rule input
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app</param>
        /// <param name="app">Application identifier which is unique within an organisation</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredBy">The party or user id of the entity having received the delegated policy</param>
        /// <param name="rule">The rule to be delegated</param>
        public static XacmlRule BuildDelegationRule(string org, string app, int offeredByPartyId, string coveredBy, Rule rule)
        {
            XacmlRule delegationRule = new XacmlRule($"urn:altinn:example:ruleid:{Guid.NewGuid()}", XacmlEffectType.Permit)
            {
                Description = $"Delegation of rights from {offeredByPartyId} to {coveredBy}, for the app; {org}/{app}"
            };

            delegationRule.Target = BuildDelegationRuleTarget(org, app, offeredByPartyId, coveredBy, rule);

            return delegationRule;
        }

        /// <summary>
        /// Builds a XacmlTarget representation based on the Rule input
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app</param>
        /// <param name="app">Application identifier which is unique within an organisation</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredBy">The party or user id of the entity having received the delegated policy</param>
        /// <param name="rule">The set of rule to be delegated</param>
        public static XacmlTarget BuildDelegationRuleTarget(string org, string app, int offeredByPartyId, string coveredBy, Rule rule)
        {
            List<XacmlAnyOf> targetList = new List<XacmlAnyOf>();

            List<XacmlAllOf> subjectAllOfs = new List<XacmlAllOf>
            {
                new XacmlAllOf(new List<XacmlMatch>
                {
                    new XacmlMatch(
                        new Uri("urn:oasis:names:tc:xacml:1.0:function:string-equal"),
                        new XacmlAttributeValue(new Uri("http://www.w3.org/2001/XMLSchema#string"), coveredBy),
                        new XacmlAttributeDesignator(new Uri("urn:oasis:names:tc:xacml:1.0:subject-category:access-subject"), new Uri("urn:altinn:userid"), new Uri("http://www.w3.org/2001/XMLSchema#string"), false))
                })
            };

            string[] resourceStrings = rule.Resource.Split("/");
            List<XacmlAllOf> resourceAllOfs = new List<XacmlAllOf>
            {
                new XacmlAllOf(new List<XacmlMatch>
                {
                    new XacmlMatch(
                        new Uri("urn:oasis:names:tc:xacml:1.0:function:string-equal"),
                        new XacmlAttributeValue(new Uri("http://www.w3.org/2001/XMLSchema#string"), offeredByPartyId.ToString()),
                        new XacmlAttributeDesignator(new Uri("urn:oasis:names:tc:xacml:3.0:attribute-category:resource"), new Uri("urn:altinn:reportee"), new Uri("http://www.w3.org/2001/XMLSchema#string"), false))
                }),
                new XacmlAllOf(new List<XacmlMatch>
                {
                    new XacmlMatch(
                        new Uri("urn:oasis:names:tc:xacml:1.0:function:string-equal"),
                        new XacmlAttributeValue(new Uri("http://www.w3.org/2001/XMLSchema#string"), org),
                        new XacmlAttributeDesignator(new Uri("urn:oasis:names:tc:xacml:3.0:attribute-category:resource"), new Uri("urn:altinn:org"), new Uri("http://www.w3.org/2001/XMLSchema#string"), false))
                }),
                new XacmlAllOf(new List<XacmlMatch>
                {
                    new XacmlMatch(
                        new Uri("urn:oasis:names:tc:xacml:1.0:function:string-equal"),
                        new XacmlAttributeValue(new Uri("http://www.w3.org/2001/XMLSchema#string"), app),
                        new XacmlAttributeDesignator(new Uri("urn:oasis:names:tc:xacml:3.0:attribute-category:resource"), new Uri("urn:altinn:app"), new Uri("http://www.w3.org/2001/XMLSchema#string"), false))
                })
            };

            if (resourceStrings.Length > 2)
            {
                resourceAllOfs.Add(
                    new XacmlAllOf(new List<XacmlMatch>
                    {
                        new XacmlMatch(
                            new Uri("urn:oasis:names:tc:xacml:1.0:function:string-equal"),
                            new XacmlAttributeValue(new Uri("http://www.w3.org/2001/XMLSchema#string"), resourceStrings[2]),
                            new XacmlAttributeDesignator(new Uri("urn:oasis:names:tc:xacml:3.0:attribute-category:resource"), new Uri("urn:altinn:task"), new Uri("http://www.w3.org/2001/XMLSchema#string"), false))
                    }));
            }

            List<XacmlAllOf> actionAllOfs = new List<XacmlAllOf>();
            actionAllOfs.Add(new XacmlAllOf(new List<XacmlMatch>
            {
                new XacmlMatch(
                    new Uri("urn:oasis:names:tc:xacml:1.0:function:string-equal"),
                    new XacmlAttributeValue(new Uri("http://www.w3.org/2001/XMLSchema#string"), rule.Action.Name),
                    new XacmlAttributeDesignator(new Uri("urn:oasis:names:tc:xacml:3.0:attribute-category:action"), new Uri("urn:oasis:names:tc:xacml:1.0:action:action-id"), new Uri("http://www.w3.org/2001/XMLSchema#string"), false))
            }));

            targetList.Add(new XacmlAnyOf(subjectAllOfs));
            targetList.Add(new XacmlAnyOf(resourceAllOfs));
            targetList.Add(new XacmlAnyOf(actionAllOfs));

            return new XacmlTarget(targetList);
        }

        /// <summary>
        /// Builds a XacmlObligationExpression representation for the required authentication level
        /// </summary>
        /// <param name="authLevel">The required authentication level</param>
        public static XacmlObligationExpression BuildDelegationPolicyObligationExpression(string authLevel)
        {
            XacmlAttributeValue attributeValue = new XacmlAttributeValue(new Uri("http://www.w3.org/2001/XMLSchema#integer"))
            {
                Value = authLevel
            };

            XacmlObligationExpression obligation = new XacmlObligationExpression(new Uri("urn:altinn:obligation:authenticationLevel1"), XacmlEffectType.Permit);
            obligation.AttributeAssignmentExpressions.Add(new XacmlAttributeAssignmentExpression(new Uri("urn:altinn:obligation1-assignment1"), attributeValue)
            {
                Category = new Uri("urn:altinn:minimum-authenticationlevel")
            });

            return obligation;
        }
    }
}
