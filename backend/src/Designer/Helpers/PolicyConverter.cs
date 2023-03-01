using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Constants;
using Altinn.Studio.Designer.Models.Authorization;

namespace Altinn.Studio.Designer.Helpers
{
    public static class PolicyConverter
    {

        public static ResourcePolicy ConvertPolicy(XacmlPolicy xacmlPolicy)
        {
            ResourcePolicy policy = new ResourcePolicy();
            policy.Rules = new List<PolicyRule>();

            foreach(XacmlRule xr in xacmlPolicy.Rules)
            {
                PolicyRule rule = new PolicyRule();
                rule.RuleId = xr.RuleId;
                rule.Description = xr.Description;

                rule.Subject = new List<RuleSubject>();
                rule.Actions = new List<RuleAction>();
                rule.Resources = new List<RuleResource>();

                foreach (XacmlAnyOf anyOf in xr.Target.AnyOf)
                {
                    foreach (XacmlAllOf allOf in anyOf.AllOf)
                    {
                        RuleSubject subject = null;
                        RuleAction action = null;
                        RuleResource resource = null;

                        foreach (XacmlMatch match in allOf.Matches.Where(m => m.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Subject)))
                        {
                            if (subject == null)
                            {
                                subject = new RuleSubject();
                                subject.Attributes = new List<AttributeMatch>();
                            }

                            AttributeMatch jsonMatch = new AttributeMatch();

                            jsonMatch.Designator = match.AttributeDesignator.AttributeId.ToString();
                            jsonMatch.Value = match.AttributeValue.Value;

                            subject.Attributes.Add(jsonMatch);
                        }

                        foreach (XacmlMatch match in allOf.Matches.Where(m => m.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Resource)))
                        {
                            if (resource == null)
                            {
                                resource = new RuleResource();
                                resource.Attributes = new List<AttributeMatch>();
                            }

                            AttributeMatch jsonMatch = new AttributeMatch();

                            jsonMatch.Designator = match.AttributeDesignator.AttributeId.ToString();
                            jsonMatch.Value = match.AttributeValue.Value;

                            resource.Attributes.Add(jsonMatch);
                        }

                        foreach (XacmlMatch match in allOf.Matches.Where(m => m.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Action)))
                        {
                            if (action == null)
                            {
                                action = new RuleAction();
                            }

                            AttributeMatch jsonMatch = new AttributeMatch();

                            jsonMatch.Designator = match.AttributeDesignator.AttributeId.ToString();
                            jsonMatch.Value = match.AttributeValue.Value;
                            action.Attribute = jsonMatch;
                        }

                        if (subject != null)
                        {
                            rule.Subject.Add(subject);
                        }

                        if (action != null)
                        {
                            rule.Actions.Add(action);
                        }

                        if (resource != null)
                        {
                            rule.Resources.Add(resource);
                        }
                    }

                }

                policy.Rules.Add(rule);
            }
            return policy;
        }


        public static XacmlPolicy ConvertPolicy(ResourcePolicy policyInput)
        {

            XacmlPolicy policyOutput = new XacmlPolicy(new Uri($"{AltinnXacmlConstants.Prefixes.PolicyId}{1}"), new Uri(XacmlConstants.CombiningAlgorithms.PolicyDenyOverrides), new XacmlTarget(new List<XacmlAnyOf>()));

            foreach (PolicyRule rule in policyInput.Rules)
            {
                XacmlRule xacmlRule = new XacmlRule(rule.RuleId, XacmlEffectType.Permit);
                xacmlRule.Description = rule.Description;
                policyOutput.Rules.Add(xacmlRule);
            }


            return policyOutput;
        }
    }
}
