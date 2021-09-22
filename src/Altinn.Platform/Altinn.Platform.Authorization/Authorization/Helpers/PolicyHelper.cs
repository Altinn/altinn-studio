using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Constants;
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
        /// Gets the entire policy as a list of ResourcePolicy. 
        /// </summary>
        /// <param name="policy">The policy</param>
        /// <returns>List of resource policies</returns>
        public static List<ResourcePolicy> GetResourcePoliciesFromXacmlPolicy(XacmlPolicy policy)
        {
            Dictionary<string, ResourcePolicy> resourcePolicies = new Dictionary<string, ResourcePolicy>();

            foreach (XacmlRule rule in policy.Rules)
            {
                if (rule.Effect.Equals(XacmlEffectType.Permit) && rule.Target != null)
                {
                    List<string> policyKeys = new List<string>();
                    List<RoleGrant> roles = new List<RoleGrant>();
                    List<ResourceAction> actions = new List<ResourceAction>();
                    foreach (XacmlAnyOf anyOf in rule.Target.AnyOf)
                    {
                        foreach (XacmlAllOf allOf in anyOf.AllOf)
                        {
                            string resourceKey = string.Empty;
                            List<AttributeMatch> resourceMatches = new List<AttributeMatch>();
                            foreach (XacmlMatch xacmlMatch in allOf.Matches)
                            {
                                if (xacmlMatch.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Resource))
                                {
                                    resourceKey += $"{xacmlMatch.AttributeDesignator.AttributeId}{xacmlMatch.AttributeValue.Value}";
                                    resourceMatches.Add(new AttributeMatch { Id = xacmlMatch.AttributeDesignator.AttributeId.OriginalString, Value = xacmlMatch.AttributeValue.Value });
                                }
                            }

                            if (!string.IsNullOrEmpty(resourceKey))
                            {
                                policyKeys.Add(resourceKey);

                                if (!resourcePolicies.ContainsKey(resourceKey))
                                {
                                    string title = string.Join("/", resourceMatches.Select(rm => rm.Value));
                                    ResourcePolicy newPolicy = new ResourcePolicy
                                    {
                                        Resource = resourceMatches,
                                        Title = new LocalizedText(title, title, title),
                                    };

                                    if (policy.Description != null)
                                    {
                                        newPolicy.Description = new LocalizedText(rule.Description, rule.Description, rule.Description);
                                    }

                                    resourcePolicies.Add(resourceKey, newPolicy);
                                }
                            }
                        }
                    }

                    foreach (XacmlAnyOf anyOf in rule.Target.AnyOf)
                    {
                        foreach (XacmlAllOf allOf in anyOf.AllOf)
                        {
                            string roleKey = string.Empty;
                            foreach (XacmlMatch xacmlMatch in allOf.Matches)
                            {
                                if (xacmlMatch.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Subject))
                                {
                                    roles.Add(new RoleGrant { RoleTypeCode = xacmlMatch.AttributeValue.Value, IsDelegable = true });
                                }
                            }
                        }
                    }

                    foreach (XacmlAnyOf anyOf in rule.Target.AnyOf)
                    {
                        foreach (XacmlAllOf allOf in anyOf.AllOf)
                        {
                            string actionKey = string.Empty;
                            AttributeMatch actionAttributeMatch = new AttributeMatch();
                            foreach (XacmlMatch xacmlMatch in allOf.Matches)
                            {
                                if (xacmlMatch.AttributeDesignator.Category.Equals(XacmlConstants.MatchAttributeCategory.Action))
                                {
                                    actionAttributeMatch.Id = xacmlMatch.AttributeDesignator.AttributeId.OriginalString;
                                    actionAttributeMatch.Value = xacmlMatch.AttributeValue.Value;
                                    ResourceAction resourceAction = new ResourceAction
                                    {
                                        Match = actionAttributeMatch,
                                        RoleGrants = new List<RoleGrant>(),
                                        Title = new LocalizedText(xacmlMatch.AttributeValue.Value, xacmlMatch.AttributeValue.Value, xacmlMatch.AttributeValue.Value)
                                    };
                                    resourceAction.RoleGrants.AddRange(roles);
                                    if (!actions.Contains(resourceAction))
                                    {
                                        actions.Add(resourceAction);
                                    }
                                }
                            }
                        }
                    }

                    foreach (string policyKey in policyKeys)
                    {
                        ResourcePolicy resourcePolicy = resourcePolicies.GetValueOrDefault(policyKey);
                        if (resourcePolicy.Actions == null)
                        {
                            resourcePolicy.Actions = new List<ResourceAction>();
                            resourcePolicy.Actions.AddRange(actions);
                        }
                        else
                        {
                            foreach (ResourceAction resourceAction in actions)
                            {
                                if (!resourcePolicy.Actions.Any(action => action.Match.Value == resourceAction.Match.Value && action.Match.Id == resourceAction.Match.Id))
                                {
                                    resourcePolicy.Actions.Add(resourceAction);
                                }
                                else
                                {
                                    ResourceAction existingAction = resourcePolicy.Actions.First(action => action.Match.Value == resourceAction.Match.Value && action.Match.Id == resourceAction.Match.Id);
                                    existingAction.RoleGrants.AddRange(resourceAction.RoleGrants.Where(roleGrant => !existingAction.RoleGrants.Any(existingRoleGrant => existingRoleGrant.RoleTypeCode == roleGrant.RoleTypeCode)));
                                }
                            }
                        }
                    }
                }
            }

            return resourcePolicies.Values.ToList();
        }
    }
}
