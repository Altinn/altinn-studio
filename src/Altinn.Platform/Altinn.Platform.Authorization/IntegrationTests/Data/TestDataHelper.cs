using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.Models;

namespace Altinn.Platform.Authorization.IntegrationTests.Data
{
    public static class TestDataHelper
    {
        public static Rule GetRuleModel(int delegatedByUserId, int offeredByPartyId, string coveredBy, string coveredByAttributeType, string action, string org, string app, string task = null, string appresource = null, bool createdSuccessfully = false)
        {
            Rule rule = new Rule
            {
                DelegatedByUserId = delegatedByUserId,
                OfferedByPartyId = offeredByPartyId,
                CoveredBy = new List<AttributeMatch> { new AttributeMatch { Id = coveredByAttributeType, Value = coveredBy } },
                Resource = new List<AttributeMatch> { new AttributeMatch { Id = AltinnXacmlConstants.MatchAttributeIdentifiers.OrgAttribute, Value = org }, new AttributeMatch { Id = AltinnXacmlConstants.MatchAttributeIdentifiers.AppAttribute, Value = app } },
                Action = new AttributeMatch { Id = XacmlConstants.MatchAttributeIdentifiers.ActionId, Value = action },
                CreatedSuccessfully = createdSuccessfully
            };

            if (task != null)
            {
                rule.Resource.Add(new AttributeMatch { Id = AltinnXacmlConstants.MatchAttributeIdentifiers.TaskAttribute, Value = task });
            }

            if (appresource != null)
            {
                rule.Resource.Add(new AttributeMatch { Id = AltinnXacmlConstants.MatchAttributeIdentifiers.AppResourceAttribute, Value = appresource });
            }

            return rule;
        }

        public static RequestToDelete GetRequestToDeleteModel(int lastChangedByUserId, int offeredByPartyId, string org, string app, List<string> ruleIds = null, int? coveredByPartyId = null, int? coveredByUserId = null)
        {
            AttributeMatch coveredBy = new AttributeMatch();
            if(coveredByUserId == null)
            {
                coveredBy.Id = AltinnXacmlConstants.MatchAttributeIdentifiers.PartyAttribute;
                coveredBy.Value = coveredByPartyId.ToString();
            }
            else
            {
                coveredBy.Id = AltinnXacmlConstants.MatchAttributeIdentifiers.UserAttribute;
                coveredBy.Value = coveredByUserId.ToString();
            }

            RequestToDelete requestToDelete = new RequestToDelete
            {
                DeletedByUserId = lastChangedByUserId,
                PolicyMatch = new PolicyMatch
                {
                    CoveredBy = new List<AttributeMatch> { coveredBy },
                    OfferedByPartyId  = offeredByPartyId,
                    Resource = new List<AttributeMatch> { new AttributeMatch { Id = AltinnXacmlConstants.MatchAttributeIdentifiers.OrgAttribute, Value = org }, new AttributeMatch { Id = AltinnXacmlConstants.MatchAttributeIdentifiers.AppAttribute, Value = app } }
                },
                
                RuleIds = ruleIds
            };

            return requestToDelete;
        }

        public static DelegationChange GetDelegationChange(string appid, int offeredByPartyId, int performedByUserId, bool isDeleted = true, int? coveredByPartyId = null, int? coveredByUserId = null)
        {
            DelegationChange result = new DelegationChange
            {
                AltinnAppId = appid,
                OfferedByPartyId = offeredByPartyId,
                CoveredByPartyId = coveredByPartyId,
                CoveredByUserId = coveredByUserId,
                PerformedByUserId = performedByUserId,
                BlobStoragePolicyPath = $"{appid}/{offeredByPartyId}/{coveredByPartyId ?? coveredByUserId}/delegationpolicy.xml",
                BlobStorageVersionId = "CorrectLeaseId",
                IsDeleted = isDeleted,
                Created = DateTime.Now
            };
            return result;
        }

        public static ResourceAction GetResourceActionModel(string action, IEnumerable<string> roles)
        {
            ResourceAction resourceAction = new ResourceAction
            {
                Match = new AttributeMatch { Id = XacmlConstants.MatchAttributeIdentifiers.ActionId, Value = action },
                RoleGrants = new List<RoleGrant>(),
                Title = action
            };

            foreach (string role in roles)
            {
                resourceAction.RoleGrants.Add(new RoleGrant { IsDelegable = true, RoleTypeCode = role });
            }

            return resourceAction;
        }

        public static ResourcePolicy GetResourcePolicyModel(string org, string app, string task = null, string endEvent = null)
        {
            string title = string.Empty;
            ResourcePolicy policy = new ResourcePolicy
            {
                Resource = new List<AttributeMatch>
                {
                    new AttributeMatch { Id = XacmlRequestAttribute.OrgAttribute, Value = org },
                    new AttributeMatch { Id = XacmlRequestAttribute.AppAttribute, Value = app }
                }
            };

            if (task != null)
            {
                policy.Resource.Add(new AttributeMatch { Id = XacmlRequestAttribute.TaskAttribute, Value = task });
                title = $"{org}/{app}/{task}";
            }

            if (endEvent != null)
            {
                policy.Resource.Add(new AttributeMatch { Id = XacmlRequestAttribute.EndEventAttribute, Value = endEvent });
                title = $"{org}/{app}/{endEvent}";
            }

            policy.Title = title;
            return policy;
        }

        public static DelegationChange GetDelegationChange(string altinnAppId, int offeredByPartyId = 0, int? coveredByPartyId = null, int? coveredByUserId = null)
        {
            return new DelegationChange
            {
                AltinnAppId = altinnAppId,
                BlobStorageVersionId = "CorrectLeaseId",
                BlobStoragePolicyPath = $"{altinnAppId}/{offeredByPartyId}/{coveredByPartyId ?? coveredByUserId}/delegationpolicy.xml",
                CoveredByPartyId = coveredByPartyId,
                CoveredByUserId = coveredByUserId,
                Created = DateTime.Now,
                IsDeleted = false,
                OfferedByPartyId = offeredByPartyId,
                PerformedByUserId = 20001336,
                PolicyChangeId = new Random().Next()
            };
        }
    }
}
