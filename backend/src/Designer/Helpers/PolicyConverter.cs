using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Constants;
using Altinn.Studio.Designer.Models.Authorization;
using k8s.Models;
using Microsoft.ApplicationInsights.AspNetCore;
using NuGet.Packaging;

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
                policyOutput.Rules.Add(ConvertRule(rule));
            }


            return policyOutput;
        }


        private static XacmlRule ConvertRule(PolicyRule policyRule)
        {
            XacmlRule xacmlRule = new XacmlRule(policyRule.RuleId, XacmlEffectType.Permit);
            xacmlRule.Description = policyRule.Description;

            List<XacmlAnyOf> ruleAnyOfs = new List<XacmlAnyOf>();
            ruleAnyOfs.Add(GetSubjectAnyOfs(policyRule.Subject));
            ruleAnyOfs.Add(GetResourceAnyOfs(policyRule.Resources));
            ruleAnyOfs.Add(GetActionAnyOfs(policyRule.Actions));
            xacmlRule.Target = new XacmlTarget(ruleAnyOfs);

            return xacmlRule;

        }


        private static XacmlAnyOf GetResourceAnyOfs(List<RuleResource> resources)
        {
            List<XacmlAllOf> resourceAllOfs = new List<XacmlAllOf>();
            foreach (RuleResource resource in resources)
            {
                List<XacmlMatch> matches = new List<XacmlMatch>();
                foreach (AttributeMatch x in resource.Attributes)
                {

                    XacmlAttributeValue xacmlAttributeValue = new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString));
                    xacmlAttributeValue.Value = x.Value;

                    XacmlAttributeDesignator xacmlAttributeDesignator = new XacmlAttributeDesignator(new Uri(x.Designator), new Uri(XacmlConstants.DataTypes.XMLString));
                    xacmlAttributeDesignator.Category = new Uri(XacmlConstants.MatchAttributeCategory.Resource);

                    XacmlMatch xacmlMatch = new XacmlMatch(new Uri(XacmlConstants.AttributeMatchFunction.StringEqualIgnoreCase), xacmlAttributeValue, xacmlAttributeDesignator);
                    matches.Add(xacmlMatch);
                }

                XacmlAllOf xacmlAllOf = new XacmlAllOf(matches);
                resourceAllOfs.Add(xacmlAllOf);

            }

            return new XacmlAnyOf(resourceAllOfs);
        }


        private static XacmlAnyOf GetSubjectAnyOfs(List<RuleSubject> subjects)
        {
            List<XacmlAllOf> subjectAllOfs = new List<XacmlAllOf>();
            foreach (RuleSubject subject in subjects)
            {
                List<XacmlMatch> matches = new List<XacmlMatch>();
                foreach (AttributeMatch x in subject.Attributes)
                {

                    XacmlAttributeValue xacmlAttributeValue = new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString));
                    xacmlAttributeValue.Value = x.Value;

                    XacmlAttributeDesignator xacmlAttributeDesignator = new XacmlAttributeDesignator(new Uri(x.Designator), new Uri(XacmlConstants.DataTypes.XMLString));
                    xacmlAttributeDesignator.Category = new Uri(XacmlConstants.MatchAttributeCategory.Subject);

                    XacmlMatch xacmlMatch = new XacmlMatch(new Uri(XacmlConstants.AttributeMatchFunction.StringEqualIgnoreCase), xacmlAttributeValue, xacmlAttributeDesignator);
                    matches.Add(xacmlMatch);
                }

                XacmlAllOf xacmlAllOf = new XacmlAllOf(matches);
                subjectAllOfs.Add(xacmlAllOf);
            }

            return new XacmlAnyOf(subjectAllOfs);
        }

        private static XacmlAnyOf GetActionAnyOfs(List<RuleAction> actions)
        {
            List<XacmlAllOf> actionAllOfs = new List<XacmlAllOf>();

                foreach (RuleAction x in actions)
                {
                    List<XacmlMatch> matches = new List<XacmlMatch>();
                    XacmlAttributeValue xacmlAttributeValue = new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString));
                    xacmlAttributeValue.Value = x.Attribute.Value;

                    XacmlAttributeDesignator xacmlAttributeDesignator = new XacmlAttributeDesignator(new Uri(x.Attribute.Designator), new Uri(XacmlConstants.DataTypes.XMLString));
                    xacmlAttributeDesignator.Category = new Uri(XacmlConstants.MatchAttributeCategory.Action);

                    XacmlMatch xacmlMatch = new XacmlMatch(new Uri(XacmlConstants.AttributeMatchFunction.StringEqualIgnoreCase), xacmlAttributeValue, xacmlAttributeDesignator);
                    matches.Add(xacmlMatch);
                    XacmlAllOf xacmlAllOf = new XacmlAllOf(matches);
                    actionAllOfs.Add(xacmlAllOf);
                }
            
            return new XacmlAnyOf(actionAllOfs);
        }
    }
}
