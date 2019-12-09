using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Authorization;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;
using static Altinn.Authorization.ABAC.Constants.XacmlConstants;

namespace Altinn.Common.PEP.Helpers
{
    public static class DecisionHelper
    {
        private const string XacmlResourcePartyId = "urn:altinn:partyid";
        private const string XacmlInstanceId = "urn:altinn:instance-id";
        private const string XacmlResourceOrgId = "urn:altinn:org";
        private const string XacmlResourceAppId = "urn:altinn:app";
        private const string XacmlResourceTaskId = "urn:altinn:task";
        private const string ParamInstanceOwnerPartyId = "instanceOwnerPartyId";
        private const string ParamInstanceGuid = "instanceGuid";
        private const string ParamApp = "app";
        private const string ParamOrg = "org";
        private const string DefaultIssuer = "Altinn";
        private const string DefaultType = "string";
        private const string subjectId = "s";
        private const string actionId = "a";
        private const string resourceId = "r";

        public static XacmlJsonRequestRoot CreateXacmlJsonMultipleRequest(string org, string app, ClaimsPrincipal user, List<string> actionTypes, string instanceOwnerPartyId, List<Instance> instances)
        {
            XacmlJsonRequest request = new XacmlJsonRequest();
            request.AccessSubject = new List<XacmlJsonCategory>();
            request.AccessSubject.Add(CreateMultipleSubjectCategory(user.Claims));
            request.Action = CreateMultipleActionCategory(actionTypes);
            request.Resource = CreateMultipleResourceCategory(org, app, instanceOwnerPartyId, instances);
            request.MultiRequests = CreateMultiRequestsCategory(request.AccessSubject, request.Action, request.Resource);

            XacmlJsonRequestRoot jsonRequest = new XacmlJsonRequestRoot() { Request = request };

            return jsonRequest;
        }

        public static XacmlJsonRequestRoot CreateXacmlJsonRequest(string org, string app, ClaimsPrincipal user, string actionType, string instanceOwnerPartyId, string instanceId)
        {
            XacmlJsonRequest request = new XacmlJsonRequest();
            request.AccessSubject = new List<XacmlJsonCategory>();
            request.Action = new List<XacmlJsonCategory>();
            request.Resource = new List<XacmlJsonCategory>();

            request.AccessSubject.Add(CreateSubjectCategory(user.Claims));
            request.Action.Add(CreateActionCategory(actionType));
            request.Resource.Add(CreateResourceCategory(org, app, instanceOwnerPartyId, instanceId));

            XacmlJsonRequestRoot jsonRequest = new XacmlJsonRequestRoot() { Request = request };

            return jsonRequest;
        }

        public static XacmlJsonRequestRoot CreateXacmlJsonRequest(AuthorizationHandlerContext context, AppAccessRequirement requirement, RouteData routeData)
        {
            XacmlJsonRequest request = new XacmlJsonRequest();
            request.AccessSubject = new List<XacmlJsonCategory>();
            request.Action = new List<XacmlJsonCategory>();
            request.Resource = new List<XacmlJsonCategory>();

            string instanceGuid = routeData.Values[ParamInstanceGuid] as string;
            string app = routeData.Values[ParamApp] as string;
            string org = routeData.Values[ParamOrg] as string;
            string instanceOwnerPartyId = routeData.Values[ParamInstanceOwnerPartyId] as string;

            request.AccessSubject.Add(CreateSubjectCategory(context.User.Claims));
            request.Action.Add(CreateActionCategory(requirement.ActionType));
            request.Resource.Add(CreateResourceCategory(org, app, instanceOwnerPartyId, instanceGuid));

            XacmlJsonRequestRoot jsonRequest = new XacmlJsonRequestRoot() { Request = request };

            return jsonRequest;
        }

        private static XacmlJsonCategory CreateMultipleSubjectCategory(IEnumerable<Claim> claims)
        {
            XacmlJsonCategory subjectAttributes = CreateSubjectCategory(claims);
            subjectAttributes.Id = subjectId + "1";

            return subjectAttributes;
        }

        private static XacmlJsonCategory CreateSubjectCategory(IEnumerable<Claim> claims)
        {
            XacmlJsonCategory subjectAttributes = new XacmlJsonCategory();
            subjectAttributes.Attribute = CreateSubjectAttributes(claims);

            return subjectAttributes;
        }

        private static List<XacmlJsonAttribute> CreateSubjectAttributes(IEnumerable<Claim> claims)
        {
            List<XacmlJsonAttribute> attributes = new List<XacmlJsonAttribute>();

            // Mapping all claims on user to attributes
            foreach (Claim claim in claims)
            {
                if (IsValidUrn(claim.Type))
                {
                    attributes.Add(CreateXacmlJsonAttribute(claim.Type, claim.Value, claim.ValueType, claim.Issuer));
                }
            }

            return attributes;
        }

        private static List<XacmlJsonCategory> CreateMultipleActionCategory(List<string> actionTypes)
        {
            List<XacmlJsonCategory> actionCategories = new List<XacmlJsonCategory>();
            int counter = 1;

            foreach (string actionType in actionTypes)
            {
                XacmlJsonCategory actionCategory;
                actionCategory = CreateActionCategory(actionType, true);
                actionCategory.Id = actionId + counter.ToString();
                actionCategories.Add(actionCategory);
                counter++;
            }
            
            return actionCategories;
        }

        private static XacmlJsonCategory CreateActionCategory(string actionType, bool includeResult = false)
        {
            XacmlJsonCategory actionAttributes = new XacmlJsonCategory();
            actionAttributes.Attribute = new List<XacmlJsonAttribute>();
            actionAttributes.Attribute.Add(CreateXacmlJsonAttribute(MatchAttributeIdentifiers.ActionId, actionType, DefaultType, DefaultIssuer, includeResult));
            return actionAttributes;
        }

        public static List<XacmlJsonCategory> CreateMultipleResourceCategory(string org, string app, string instanceOwnerPartyId, List<Instance> instances)
        {
            List<XacmlJsonCategory> resourcesCategories = new List<XacmlJsonCategory>();
            int counter = 1;

            foreach (Instance instance in instances)
            {
                XacmlJsonCategory resourceCategory = new XacmlJsonCategory();
                resourceCategory.Attribute = new List<XacmlJsonAttribute>();

                string instanceId = instance.Id;
                string task = instance.Process?.CurrentTask?.Name ?? "";

                if (!string.IsNullOrWhiteSpace(instanceId))
                {
                    resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(XacmlInstanceId, instanceOwnerPartyId + "/" + instanceId, DefaultType, DefaultIssuer, true));
                }
                resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourcePartyId, instanceOwnerPartyId, DefaultType, DefaultIssuer));
                resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceOrgId, org, DefaultType, DefaultIssuer));
                resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceAppId, app, DefaultType, DefaultIssuer));
                resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceTaskId, task, DefaultType, DefaultIssuer));
                resourceCategory.Id = resourceId + counter.ToString();
                resourcesCategories.Add(resourceCategory);
                counter++;
            }

            return resourcesCategories;
        }

        private static XacmlJsonCategory CreateResourceCategory(string org, string app, string instanceOwnerPartyId, string instanceGuid, bool includeResult = false)
        {
            XacmlJsonCategory resourceCategory = new XacmlJsonCategory();
            resourceCategory.Attribute = new List<XacmlJsonAttribute>();

            if (string.IsNullOrWhiteSpace(instanceOwnerPartyId))
            {
                resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(XacmlInstanceId, instanceGuid, DefaultType, DefaultIssuer, includeResult));
            }
            else if (string.IsNullOrWhiteSpace(instanceGuid))
            {
                resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourcePartyId, instanceOwnerPartyId, DefaultType, DefaultIssuer, includeResult));
            }
            else
            {
                resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(XacmlInstanceId, instanceOwnerPartyId + "/" + instanceGuid, DefaultType, DefaultIssuer, includeResult));
            }
            
            resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceOrgId, org, DefaultType, DefaultIssuer));
            resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceAppId, app, DefaultType, DefaultIssuer));

            return resourceCategory;
        }

        private static XacmlJsonMultiRequests CreateMultiRequestsCategory(List<XacmlJsonCategory> subjects, List<XacmlJsonCategory> actions, List<XacmlJsonCategory> resources)
        {
            List<string> subjectIds = subjects.Select(s => s.Id).ToList();
            List<string> actionIds = actions.Select(a => a.Id).ToList();
            List<string> resourceIds = resources.Select(r => r.Id).ToList();

            XacmlJsonMultiRequests multiRequests = new XacmlJsonMultiRequests();
            multiRequests.RequestReference = CreateRequestReference(subjectIds, actionIds, resourceIds);

            return multiRequests;
        }

        public static List<XacmlJsonRequestReference> CreateRequestReference(List<string> subjectIds, List<string> actionIds, List<string> resourceIds)
        {
            List<XacmlJsonRequestReference> references = new List<XacmlJsonRequestReference>();

            foreach (string resourceId in resourceIds)
            {
                foreach (string actionId in actionIds)
                {
                    foreach (string subjectId in subjectIds)
                    {
                        XacmlJsonRequestReference reference = new XacmlJsonRequestReference();
                        List<string> referenceId = new List<string>();
                        referenceId.Add(subjectId);
                        referenceId.Add(actionId);
                        referenceId.Add(resourceId);
                        reference.ReferenceId = referenceId;
                        references.Add(reference);
                    }
                }
            }

            return references;
        }

        private static XacmlJsonAttribute CreateXacmlJsonAttribute(string attributeId, string value, string dataType, string issuer, bool includeResult = false)
        {
            XacmlJsonAttribute xacmlJsonAttribute = new XacmlJsonAttribute();

            xacmlJsonAttribute.AttributeId = attributeId;
            xacmlJsonAttribute.Value = value;
            xacmlJsonAttribute.DataType = dataType;
            xacmlJsonAttribute.Issuer = issuer;
            xacmlJsonAttribute.IncludeInResult = includeResult;

            return xacmlJsonAttribute;
        }

        private static bool IsValidUrn(string value)
        {
            Regex regex = new Regex("^urn*");
            return regex.Match(value).Success ? true : false;
        }

        public static bool ValidateResponse(List<XacmlJsonResult> results, ClaimsPrincipal user)
        {
            if (results == null)
            {
                throw new ArgumentNullException("results");
            }

            if (user == null)
            {
                throw new ArgumentNullException("user");
            }

            return ValidatePdpDecision(results, user);
        }

        private static bool ValidatePdpDecision(List<XacmlJsonResult> results, ClaimsPrincipal user)
        {
            // We request one thing and then only want one result
            if (results.Count != 1)
            {
                return false;
            }

            return ValidateDecisionResult(results.First(), user);
        }

        public static bool ValidateDecisionResult(XacmlJsonResult result, ClaimsPrincipal user)
        {
            // Checks that the result is nothing else than "permit"
            if (!result.Decision.Equals(XacmlContextDecision.Permit.ToString()))
            {
                return false;
            }

            // Checks if the result contains obligation
            if (result.Obligations != null)
            {
                List<XacmlJsonObligationOrAdvice> obligationList = result.Obligations;
                XacmlJsonAttributeAssignment attributeMinLvAuth = obligationList.Select(a => a.AttributeAssignment.Find(a => a.Category.Equals("urn:altinn:minimum-authenticationlevel"))).FirstOrDefault();

                // Checks if the obligation contains a minimum authentication level attribute
                if (attributeMinLvAuth != null)
                {
                    string minAuthenticationLevel = attributeMinLvAuth.Value;
                    string usersAuthenticationLevel = user.Claims.FirstOrDefault(c => c.Type.Equals("urn:altinn:authlevel")).Value;

                    // Checks that the user meets the minimum authentication level
                    if (Convert.ToInt32(usersAuthenticationLevel) < Convert.ToInt32(minAuthenticationLevel))
                    {
                        return false;
                    }
                }
            }

            return true;
        }
    }
}
