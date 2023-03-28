using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
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

                rule.Subject = new List<string>();
                rule.Actions = new List<string>();
                rule.Resources = new List<List<string>>();

                foreach (XacmlAnyOf anyOf in xr.Target.AnyOf)
                {
                    foreach (XacmlAllOf allOf in anyOf.AllOf)
                    {
                        List<string> subject = null;
                        List<string> action = null;
                        List<string> resource = null;

                        foreach (XacmlMatch match in allOf.Matches.Where(m => m.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Subject)))
                        {
                            if (subject == null)
                            {
                                subject = new List<string>();
                            }

                            subject.Add($"{match.AttributeDesignator.AttributeId.ToString()}:{match.AttributeValue.Value}");
                        }

                        foreach (XacmlMatch match in allOf.Matches.Where(m => m.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Resource)))
                        {
                            if (resource == null)
                            {
                                resource = new List<string>();
                            }

                            resource.Add($"{match.AttributeDesignator.AttributeId.ToString()}:{match.AttributeValue.Value}");

                        }

                        foreach (XacmlMatch match in allOf.Matches.Where(m => m.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Action)))
                        {
                            if (action == null)
                            {
                                action = new List<string>();
                            }

                            action.Add(match.AttributeValue.Value);
                        }

                        if (subject != null)
                        {
                            rule.Subject.AddRange(subject);
                        }

                        if (action != null)
                        {
                            rule.Actions.AddRange(action);
                        }

                        if (resource != null)
                        {
                            rule.Resources.Add(resource);
                        }
                    }

                }

                policy.Rules.Add(rule);
            }

            foreach(XacmlObligationExpression obligationExpression in xacmlPolicy.ObligationExpressions)
            {
                foreach (XacmlAttributeAssignmentExpression attributeAssignmentExpression in obligationExpression.AttributeAssignmentExpressions)
                {
                    if (attributeAssignmentExpression.Category.Equals(AltinnXacmlConstants.MatchAttributeCategory.MinimumAuthenticationLevel))
                    {
                        XacmlAttributeValue astr = attributeAssignmentExpression.Property as XacmlAttributeValue;
                        policy.RequiredAuthenticationLevelEndUser = astr.Value;
                    }

                }
            }

            return policy;
        }


        public static XacmlPolicy ConvertPolicy(ResourcePolicy policyInput)
        {

            XacmlPolicy policyOutput = new XacmlPolicy(new Uri($"{AltinnXacmlConstants.Prefixes.PolicyId}{1}"), new Uri(XacmlConstants.CombiningAlgorithms.RuleDenyOverrides), new XacmlTarget(new List<XacmlAnyOf>()));

            foreach (PolicyRule rule in policyInput.Rules)
            {
                policyOutput.Rules.Add(ConvertRule(rule));
            }

            policyOutput.ObligationExpressions.Add(GetAuthenticationLevelObligation(policyInput.RequiredAuthenticationLevelEndUser));

            return policyOutput;
        }


        private static XacmlRule ConvertRule(PolicyRule policyRule)
        {
            XacmlRule xacmlRule = new XacmlRule(policyRule.RuleId, XacmlEffectType.Permit);
            xacmlRule.Description = policyRule.Description;

            List<XacmlAnyOf> ruleAnyOfs = new List<XacmlAnyOf>();
            if(policyRule.Subject != null && policyRule.Subject.Count > 0)
            {
                ruleAnyOfs.Add(GetSubjectAnyOfs(policyRule.Subject));
            }
            if (policyRule.Resources != null && policyRule.Resources.Count > 0)
            {
                ruleAnyOfs.Add(GetResourceAnyOfs(policyRule.Resources));
            }
            if(policyRule.Actions!= null && policyRule.Actions.Count > 0)
            {
                ruleAnyOfs.Add(GetActionAnyOfs(policyRule.Actions));
            }

            xacmlRule.Target = new XacmlTarget(ruleAnyOfs);

            return xacmlRule;

        }


        private static XacmlAnyOf GetResourceAnyOfs(List<List<string>> resources)
        {
            List<XacmlAllOf> resourceAllOfs = new List<XacmlAllOf>();
            foreach (List<string> resource in resources)
            {
                List<XacmlMatch> matches = new List<XacmlMatch>();
                foreach (string res in resource)
                {
                    int splitLocation = res.LastIndexOf(":");
                    string attributeDesignator = res.Substring(0, splitLocation);
                    string attributeValue = res.Substring(splitLocation+1);

                    XacmlAttributeValue xacmlAttributeValue = new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString));
                    xacmlAttributeValue.Value = attributeValue;

                    XacmlAttributeDesignator xacmlAttributeDesignator = new XacmlAttributeDesignator(new Uri(attributeDesignator), new Uri(XacmlConstants.DataTypes.XMLString));
                    xacmlAttributeDesignator.Category = new Uri(XacmlConstants.MatchAttributeCategory.Resource);
                    xacmlAttributeDesignator.MustBePresent = false;

                    XacmlMatch xacmlMatch = new XacmlMatch(new Uri(XacmlConstants.AttributeMatchFunction.StringEqual), xacmlAttributeValue, xacmlAttributeDesignator);
                    matches.Add(xacmlMatch);
                }

                XacmlAllOf xacmlAllOf = new XacmlAllOf(matches);
                resourceAllOfs.Add(xacmlAllOf);

            }

            return new XacmlAnyOf(resourceAllOfs);
        }


        private static XacmlAnyOf GetSubjectAnyOfs(List<string> subjects)
        {
            List<XacmlAllOf> subjectAllOfs = new List<XacmlAllOf>();
            foreach (string subject in subjects)
            {
                List<XacmlMatch> matches = new List<XacmlMatch>();
                int splitLocation = subject.LastIndexOf(":");
                string attributeDesignator = subject.Substring(0, splitLocation);
                string attributeValue = subject.Substring(splitLocation+1);

                XacmlAttributeValue xacmlAttributeValue = new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString));
                xacmlAttributeValue.Value = attributeValue;

                XacmlAttributeDesignator xacmlAttributeDesignator = new XacmlAttributeDesignator(new Uri(attributeDesignator), new Uri(XacmlConstants.DataTypes.XMLString));
                xacmlAttributeDesignator.Category = new Uri(XacmlConstants.MatchAttributeCategory.Subject);
                xacmlAttributeDesignator.MustBePresent = false;

                XacmlMatch xacmlMatch = new XacmlMatch(new Uri(XacmlConstants.AttributeMatchFunction.StringEqualIgnoreCase), xacmlAttributeValue, xacmlAttributeDesignator);
                matches.Add(xacmlMatch);

                XacmlAllOf xacmlAllOf = new XacmlAllOf(matches);
                subjectAllOfs.Add(xacmlAllOf);
            }

            return new XacmlAnyOf(subjectAllOfs);
        }

        private static XacmlAnyOf GetActionAnyOfs(List<string> actions)
        {
            List<XacmlAllOf> actionAllOfs = new List<XacmlAllOf>();

                foreach (string action in actions)
                {
                    List<XacmlMatch> matches = new List<XacmlMatch>();
                    XacmlAttributeValue xacmlAttributeValue = new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString));
                    xacmlAttributeValue.Value = action;

                    XacmlAttributeDesignator xacmlAttributeDesignator = new XacmlAttributeDesignator(new Uri(XacmlConstants.MatchAttributeIdentifiers.ActionId), new Uri(XacmlConstants.DataTypes.XMLString));
                    xacmlAttributeDesignator.Category = new Uri(XacmlConstants.MatchAttributeCategory.Action);
                    xacmlAttributeDesignator.MustBePresent = false;

                    XacmlMatch xacmlMatch = new XacmlMatch(new Uri(XacmlConstants.AttributeMatchFunction.StringEqual), xacmlAttributeValue, xacmlAttributeDesignator);
                    matches.Add(xacmlMatch);
                    XacmlAllOf xacmlAllOf = new XacmlAllOf(matches);
                    actionAllOfs.Add(xacmlAllOf);
                }
            
            return new XacmlAnyOf(actionAllOfs);
        }


        private static  XacmlObligationExpression GetAuthenticationLevelObligation(string level)
        {
            XacmlObligationExpression expression = new XacmlObligationExpression(new Uri("urn:altinn:obligation:authenticationLevel1"), XacmlEffectType.Permit);

            XacmlAttributeValue astr = new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLInteger));
            astr.Value = level;


            XacmlAttributeAssignmentExpression xacmlAttributeAssignmentExpression = new XacmlAttributeAssignmentExpression(new Uri("urn:altinn:obligation1-assignment1"), astr);
            xacmlAttributeAssignmentExpression.Category = new Uri(AltinnXacmlConstants.MatchAttributeCategory.MinimumAuthenticationLevel);
            expression.AttributeAssignmentExpressions.Add(xacmlAttributeAssignmentExpression);
            expression.FulfillOn = XacmlEffectType.Permit;
            return expression;
        }
    }
}
