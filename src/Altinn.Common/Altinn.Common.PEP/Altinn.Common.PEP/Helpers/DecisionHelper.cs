using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;

using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Constants;
using Altinn.Common.PEP.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;

using static Altinn.Authorization.ABAC.Constants.XacmlConstants;

namespace Altinn.Common.PEP.Helpers
{
    /// <summary>
    /// Represents a collection of helper methods for creating a decision request
    /// </summary>
    public static class DecisionHelper
    {
        private const string ParamInstanceOwnerPartyId = "instanceOwnerPartyId";
        private const string ParamInstanceGuid = "instanceGuid";
        private const string ParamApp = "app";
        private const string ParamOrg = "org";
        private const string ParamAppId = "appId";
        private const string DefaultIssuer = "Altinn";
        private const string DefaultType = "string";

        private const string PolicyObligationMinAuthnLevel = "urn:altinn:minimum-authenticationlevel";
        private const string PolicyObligationMinAuthnLevelOrg = "urn:altinn:minimum-authenticationlevel-org";

        /// <summary>
        /// Create decision request based for policy decision point.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="user">Claims principal user.</param>
        /// <param name="actionType">Policy action type i.e. read, write, delete, instantiate.</param>
        /// <param name="instanceOwnerPartyId">Unique id of the party that is the owner of the instance.</param>
        /// <param name="instanceGuid">Unique id to identify the instance.</param>
        /// <param name="taskid">The taskid. Will override contexthandler if present</param>
        /// <returns>The decision request.</returns>
        public static XacmlJsonRequestRoot CreateDecisionRequest(string org, string app, ClaimsPrincipal user, string actionType, int instanceOwnerPartyId, Guid? instanceGuid, string taskid = null)
        {
            XacmlJsonRequest request = new XacmlJsonRequest();
            request.AccessSubject = new List<XacmlJsonCategory>();
            request.Action = new List<XacmlJsonCategory>();
            request.Resource = new List<XacmlJsonCategory>();

            request.AccessSubject.Add(CreateSubjectCategory(user.Claims));
            request.Action.Add(CreateActionCategory(actionType));
            request.Resource.Add(CreateResourceCategory(org, app, instanceOwnerPartyId.ToString(), instanceGuid.ToString(), taskid));

            XacmlJsonRequestRoot jsonRequest = new XacmlJsonRequestRoot() { Request = request };

            return jsonRequest;
        }

        /// <summary>
        /// Create a new <see cref="XacmlJsonRequestRoot"/> to represent a decision request.
        /// </summary>
        /// <param name="context">The current <see cref="AuthorizationHandlerContext"/></param>
        /// <param name="requirement">The access requirements</param>
        /// <param name="routeData">The route data from a request.</param>
        /// <returns>A decision request</returns>
        public static XacmlJsonRequestRoot CreateDecisionRequest(AuthorizationHandlerContext context, AppAccessRequirement requirement, RouteData routeData)
        {
            XacmlJsonRequest request = new XacmlJsonRequest();
            request.AccessSubject = new List<XacmlJsonCategory>();
            request.Action = new List<XacmlJsonCategory>();
            request.Resource = new List<XacmlJsonCategory>();

            string instanceGuid = routeData.Values[ParamInstanceGuid] as string;
            string app = routeData.Values[ParamApp] as string;
            string org = routeData.Values[ParamOrg] as string;
            string instanceOwnerPartyId = routeData.Values[ParamInstanceOwnerPartyId] as string;

            if (string.IsNullOrWhiteSpace(app) && string.IsNullOrWhiteSpace(org))
            {
                string appId = routeData.Values[ParamAppId] as string;
                if (appId != null)
                {
                    org = appId.Split("/")[0];
                    app = appId.Split("/")[1];
                }
            }

            request.AccessSubject.Add(CreateSubjectCategory(context.User.Claims));
            request.Action.Add(CreateActionCategory(requirement.ActionType));
            request.Resource.Add(CreateResourceCategory(org, app, instanceOwnerPartyId, instanceGuid, null));

            XacmlJsonRequestRoot jsonRequest = new XacmlJsonRequestRoot() { Request = request };

            return jsonRequest;
        }

        /// <summary>
        /// Create a new <see cref="XacmlJsonCategory"/> with a list of subject attributes based on the given claims.
        /// </summary>
        /// <param name="claims">The list of claims</param>
        /// <returns>A populated subject category</returns>
        public static XacmlJsonCategory CreateSubjectCategory(IEnumerable<Claim> claims)
        {
            XacmlJsonCategory subjectAttributes = new XacmlJsonCategory();
            subjectAttributes.Attribute = CreateSubjectAttributes(claims);

            return subjectAttributes;
        }

        /// <summary>
        /// Create a new <see cref="XacmlJsonCategory"/> attribute of type Action with the given action type
        /// </summary>
        /// <param name="actionType">The action type</param>
        /// <param name="includeResult">A value indicating whether the value should be included in the result.</param>
        /// <returns>The created category</returns>
        public static XacmlJsonCategory CreateActionCategory(string actionType, bool includeResult = false)
        {
            XacmlJsonCategory actionAttributes = new XacmlJsonCategory();
            actionAttributes.Attribute = new List<XacmlJsonAttribute>();
            actionAttributes.Attribute.Add(CreateXacmlJsonAttribute(MatchAttributeIdentifiers.ActionId, actionType, DefaultType, DefaultIssuer, includeResult));
            return actionAttributes;
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

        private static XacmlJsonCategory CreateResourceCategory(string org, string app, string instanceOwnerPartyId, string instanceGuid, string task, bool includeResult = false)
        {
            XacmlJsonCategory resourceCategory = new XacmlJsonCategory();
            resourceCategory.Attribute = new List<XacmlJsonAttribute>();

            if (!string.IsNullOrWhiteSpace(instanceOwnerPartyId))
            {
                resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(AltinnXacmlUrns.PartyId, instanceOwnerPartyId, DefaultType, DefaultIssuer, includeResult));
            }

            if (!string.IsNullOrWhiteSpace(instanceGuid) && !string.IsNullOrWhiteSpace(instanceOwnerPartyId))
            {
                resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(AltinnXacmlUrns.InstanceId, instanceOwnerPartyId + "/" + instanceGuid, DefaultType, DefaultIssuer, includeResult));
            }

            if (!string.IsNullOrWhiteSpace(org))
            {
                resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(AltinnXacmlUrns.OrgId, org, DefaultType, DefaultIssuer));
            }

            if (!string.IsNullOrWhiteSpace(app))
            {
                resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(AltinnXacmlUrns.AppId, app, DefaultType, DefaultIssuer));
            }

            if (!string.IsNullOrWhiteSpace(task))
            {
                resourceCategory.Attribute.Add(CreateXacmlJsonAttribute(AltinnXacmlUrns.TaskId, task, DefaultType, DefaultIssuer));
            }

            return resourceCategory;
        }

        /// <summary>
        /// Create a new <see cref="XacmlJsonAttribute"/> with the given values.
        /// </summary>
        /// <param name="attributeId">The attribute id</param>
        /// <param name="value">The attribute value</param>
        /// <param name="dataType">The datatype for the attribute value</param>
        /// <param name="issuer">The issuer</param>
        /// <param name="includeResult">A value indicating whether the value should be included in the result.</param>
        /// <returns>A new created attribute</returns>
        public static XacmlJsonAttribute CreateXacmlJsonAttribute(string attributeId, string value, string dataType, string issuer, bool includeResult = false)
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
            return regex.Match(value).Success;
        }

        /// <summary>
        /// Validate the response from PDP
        /// </summary>
        /// <param name="results">The response to validate</param>
        /// <param name="user">The <see cref="ClaimsPrincipal"/></param>
        /// <returns>true or false, valid or not</returns>
        public static bool ValidatePdpDecision(List<XacmlJsonResult> results, ClaimsPrincipal user)
        {
            if (results == null)
            {
                throw new ArgumentNullException("results");
            }

            if (user == null)
            {
                throw new ArgumentNullException("user");
            }

            // We request one thing and then only want one result
            if (results.Count != 1)
            {
                return false;
            }

            return ValidateDecisionResult(results.First(), user);
        }

        /// <summary>
        /// Validate the response from PDP
        /// </summary>
        /// <param name="results">The response to validate</param>
        /// <param name="user">The <see cref="ClaimsPrincipal"/></param>
        /// <returns>The result of the validation</returns>
        public static EnforcementResult ValidatePdpDecisionDetailed(List<XacmlJsonResult> results, ClaimsPrincipal user)
        {
            if (results == null)
            {
                throw new ArgumentNullException("results");
            }

            if (user == null)
            {
                throw new ArgumentNullException("user");
            }

            // We request one thing and then only want one result
            if (results.Count != 1)
            {
                return new EnforcementResult() { Authorized = false };
            }

            return ValidateDecisionResultDetailed(results.First(), user);
        }

        /// <summary>
        /// Validate the response from PDP
        /// </summary>
        /// <param name="result">The response to validate</param>
        /// <param name="user">The <see cref="ClaimsPrincipal"/></param>
        /// <returns>true or false, valid or not</returns>
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
                XacmlJsonAttributeAssignment attributeMinLvAuth = GetObligation(PolicyObligationMinAuthnLevel, obligationList);

                // Checks if the obligation contains a minimum authentication level attribute
                if (attributeMinLvAuth != null)
                {
                    string minAuthenticationLevel = attributeMinLvAuth.Value;
                    string usersAuthenticationLevel = user.Claims.FirstOrDefault(c => c.Type.Equals("urn:altinn:authlevel")).Value;

                    // Checks that the user meets the minimum authentication level
                    if (Convert.ToInt32(usersAuthenticationLevel) < Convert.ToInt32(minAuthenticationLevel))
                    {
                        if (user.Claims.FirstOrDefault(c => c.Type.Equals("urn:altinn:org")) != null)
                        {
                            XacmlJsonAttributeAssignment attributeMinLvAuthOrg = GetObligation(PolicyObligationMinAuthnLevelOrg, obligationList);
                            if (attributeMinLvAuthOrg != null)
                            {
                                if (Convert.ToInt32(usersAuthenticationLevel) >= Convert.ToInt32(attributeMinLvAuthOrg.Value))
                                {
                                    return true;
                                }
                            }
                        }

                        return false;
                    }
                }
            }

            return true;
        }

        /// <summary>
        /// Validate the response from PDP
        /// </summary>
        /// <param name="result">The response to validate</param>
        /// <param name="user">The <see cref="ClaimsPrincipal"/></param>
        /// <returns>The result of the validation</returns>
        public static EnforcementResult ValidateDecisionResultDetailed(XacmlJsonResult result, ClaimsPrincipal user)
        {
            // Checks that the result is nothing else than "permit"
            if (!result.Decision.Equals(XacmlContextDecision.Permit.ToString()))
            {
                return new EnforcementResult() { Authorized = false };
            }

            // Checks if the result contains obligation
            if (result.Obligations != null)
            {
                List<XacmlJsonObligationOrAdvice> obligationList = result.Obligations;
                XacmlJsonAttributeAssignment attributeMinLvAuth = GetObligation(PolicyObligationMinAuthnLevel, obligationList);

                // Checks if the obligation contains a minimum authentication level attribute
                if (attributeMinLvAuth != null)
                {
                    string minAuthenticationLevel = attributeMinLvAuth.Value;
                    string usersAuthenticationLevel = user.Claims.FirstOrDefault(c => c.Type.Equals("urn:altinn:authlevel")).Value;

                    // Checks that the user meets the minimum authentication level
                    if (Convert.ToInt32(usersAuthenticationLevel) < Convert.ToInt32(minAuthenticationLevel))
                    {
                        if (user.Claims.FirstOrDefault(c => c.Type.Equals("urn:altinn:org")) != null)
                        {
                            XacmlJsonAttributeAssignment attributeMinLvAuthOrg = GetObligation(PolicyObligationMinAuthnLevelOrg, obligationList);
                            if (attributeMinLvAuthOrg != null)
                            {
                                if (Convert.ToInt32(usersAuthenticationLevel) >= Convert.ToInt32(attributeMinLvAuthOrg.Value))
                                {
                                    return new EnforcementResult() { Authorized = true };
                                }

                                minAuthenticationLevel = attributeMinLvAuthOrg.Value;
                            }
                        }

                        return new EnforcementResult()
                        {
                            Authorized = false,
                            FailedObligations = new Dictionary<string, string>()
                            {
                                { AltinnObligations.RequiredAuthenticationLevel, minAuthenticationLevel }
                            }
                        };
                    }
                }
            }

            return new EnforcementResult() { Authorized = true };
        }

        private static XacmlJsonAttributeAssignment GetObligation(string category, List<XacmlJsonObligationOrAdvice> obligations)
        {
            foreach (XacmlJsonObligationOrAdvice obligation in obligations)
            {
                XacmlJsonAttributeAssignment assignment = obligation.AttributeAssignment.FirstOrDefault(a => a.Category.Equals(category));
                if (assignment != null)
                {
                    return assignment;
                }
            }

            return null;
        }
    }
}
