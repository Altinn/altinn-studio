using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Authorization;
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
        private const string XacmlResourceOrgId = "urn:altinn:org";
        private const string XacmlResourceAppId = "urn:altinn:app";
        private const string ParamInstanceOwnerId = "instanceOwnerId";
        private const string ParamInstanceGuid = "instanceGuid";
        private const string ParamApp = "app";
        private const string ParamOrg = "org";
        private const string defaultIssuer = "Altinn";
        private const string defaultType = "string";

        public static XacmlJsonRequest CreateXacmlJsonRequest(string org, string app, ClaimsPrincipal user, string actionType, string partyId)
        {
            XacmlJsonRequest request = new XacmlJsonRequest();

            request.AccessSubject = new List<XacmlJsonCategory>();
            request.Action = new List<XacmlJsonCategory>();
            request.Resource = new List<XacmlJsonCategory>();

            request.AccessSubject.Add(CreateSubjectCategory(user.Claims));
            request.Action.Add(CreateActionCategory(actionType));
            request.Resource.Add(CreateResourceCategory(org, app, partyId));

            return request;
        }

        public static XacmlJsonRequest CreateXacmlJsonRequest(AuthorizationHandlerContext context, AppAccessRequirement requirement, RouteData routeData)
        {
            XacmlJsonRequest request = new XacmlJsonRequest();
            request.AccessSubject = new List<XacmlJsonCategory>();
            request.Action = new List<XacmlJsonCategory>();
            request.Resource = new List<XacmlJsonCategory>();

            string instanceGuid = routeData.Values[ParamInstanceGuid] as string;
            string app = routeData.Values[ParamApp] as string;
            string org = routeData.Values[ParamOrg] as string;
            string instanceOwnerId = routeData.Values[ParamInstanceOwnerId] as string;

            request.AccessSubject.Add(CreateSubjectCategory(context.User.Claims));
            request.Action.Add(CreateActionCategory(requirement.ActionType));
            request.Resource.Add(CreateResourceCategory(org, app, instanceOwnerId + "/" + instanceGuid));

            return request;
        }

        private static XacmlJsonCategory CreateSubjectCategory(IEnumerable<Claim> claims)
        {
            XacmlJsonCategory subjectAttributes = new XacmlJsonCategory();
            subjectAttributes.Attribute = new List<XacmlJsonAttribute>();

            // Mapping all claims on user to attributes
            foreach (Claim claim in claims)
            {
                if (IsValidUrn(claim.Type))
                {
                    subjectAttributes.Attribute.Add(CreateXacmlJsonAttribute(claim.Type, claim.Value, claim.ValueType, claim.Issuer));
                }
            }

            return subjectAttributes;
        }

        private static XacmlJsonCategory CreateActionCategory(string actionType)
        {
            XacmlJsonCategory actionAttributes = new XacmlJsonCategory();
            actionAttributes.Attribute = new List<XacmlJsonAttribute>();
            actionAttributes.Attribute.Add(CreateXacmlJsonAttribute(MatchAttributeIdentifiers.ActionId, actionType, defaultType, defaultIssuer));
            return actionAttributes;
        }

        private static XacmlJsonCategory CreateResourceCategory(string org, string app, string instanceOwnerId)
        {
            XacmlJsonCategory resourceAttributes = new XacmlJsonCategory();
            resourceAttributes.Attribute = new List<XacmlJsonAttribute>();

            resourceAttributes.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourcePartyId, instanceOwnerId, defaultType, defaultIssuer));
            resourceAttributes.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceOrgId, org, defaultType, defaultIssuer));
            resourceAttributes.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceAppId, app, defaultType, defaultIssuer));

            return resourceAttributes;
        }

        private static XacmlJsonAttribute CreateXacmlJsonAttribute(string attributeId, string value, string dataType, string issuer)
        {
            XacmlJsonAttribute xacmlJsonAttribute = new XacmlJsonAttribute();

            xacmlJsonAttribute.AttributeId = attributeId;
            xacmlJsonAttribute.Value = value;
            xacmlJsonAttribute.DataType = dataType;
            xacmlJsonAttribute.Issuer = issuer;

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

            return IsResponseValid(results, user);
        }

        private static bool IsResponseValid(List<XacmlJsonResult> results, ClaimsPrincipal user)
        {
            // We request one thing and then only want one result
            if (results.Count != 1)
            {
                return false;
            }

            // Checks that the result is nothing else than "permit"
            if (!results.First().Decision.Equals(XacmlContextDecision.Permit.ToString()))
            {
                return false;
            }

            // Checks if the result contains obligation
            if (results.First().Obligations != null && results.Count > 0)
            {
                List<XacmlJsonObligationOrAdvice> obligationList = results.First().Obligations;
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
