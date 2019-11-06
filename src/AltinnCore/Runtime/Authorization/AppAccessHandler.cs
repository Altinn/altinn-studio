namespace AltinnCore.Runtime.Authorization
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Security.Claims;
    using System.Threading.Tasks;
    using Altinn.Authorization.ABAC.Xacml;
    using Altinn.Authorization.ABAC.Xacml.JsonProfile;
    using AltinnCore.Authentication.Constants;
    using AltinnCore.Common.Constants;
    using AltinnCore.Common.Enums;
    using AltinnCore.Common.Services.Interfaces;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Http;
    using Microsoft.AspNetCore.Mvc.Filters;
    using Microsoft.AspNetCore.Routing;
    using static Altinn.Authorization.ABAC.Constants.XacmlConstants;

    /// <summary>
    /// AuthorizationHandler that is created for handling access to service instances.
    /// Authorizes based om InstanceAccessRequirement and instance id from route
    /// <see href="https://docs.asp.net/en/latest/security/authorization/policies.html"/> for details about authorization
    /// in asp.net core
    /// </summary>
    public class AppAccessHandler : AuthorizationHandler<AppAccessRequirement>
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IAuthorization _authorizationService;
        private const string XacmlResourceInstanceId = "urn:altinn:instance-id";
        private const string XacmlResourceOrgId = "urn:altinn:org";
        private const string XacmlResourceAppId = "urn:altinn:app";
        private const string ParamInstanceOwnerId = "instanceOwnerId";
        private const string ParamInstanceGuid = "instanceGuid";
        private const string ParamApp = "app";
        private const string ParamOrg = "org";

        /// <summary>
        /// Initializes a new instance of the <see cref="AppAccessHandler"/> class.
        /// </summary>
        /// <param name="httpContextAccessor">the http context accessor</param>
        public AppAccessHandler(IHttpContextAccessor httpContextAccessor, IAuthorization authorizationService)
        {
            _httpContextAccessor = httpContextAccessor;
            _authorizationService = authorizationService;
        }

        /// <summary>
        /// This method authorize access bases on context and requirement
        /// Is triggered by annotation on MVC action and setup in startup.
        /// </summary>
        /// <param name="context">The context</param>
        /// <param name="requirement">The requirement</param>
        /// <returns>A Task</returns>
        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, AppAccessRequirement requirement)
        {
            XacmlJsonRequest request = CreateXacmlJsonRequest(context, requirement);
            XacmlJsonResponse response = await _authorizationService.GetDecisionForRequest(request);

            // Decide if request is permitted by the response it gets from pdp
            List<XacmlJsonResult> results = response.Response;

            // Checks that we only got one result
            if (results.Count != 1)
            {
                context.Fail();
            }

            // Checks that the response is nothing else than "permit"
            if (!results.First().Decision.Equals(XacmlContextDecision.Permit.ToString()))
            {
                context.Fail();
            }

            // Checks that the user has the minimum authentication level if required 
            if (results.First().Obligations != null && results.Count > 0)
            {
                List<XacmlJsonObligationOrAdvice> obligationList = results.First().Obligations;
                XacmlJsonAttributeAssignment attributeAssignment = obligationList.Select(a => a.AttributeAssignment.Find(a => a.Category.Equals("urn:altinn:minimum-authenticationlevel"))).FirstOrDefault();

                if (attributeAssignment != null)
                {
                    string minAuthenticationLevel = attributeAssignment.Value;
                    string usersAuthenticationLevel = context.User.Claims.FirstOrDefault(c => c.Type.Equals("AuthenticationLevel")).Value;

                    if (Convert.ToInt32(usersAuthenticationLevel) < Convert.ToInt32(minAuthenticationLevel))
                    {
                        context.Fail();
                    }
                }
            }

            await Task.CompletedTask;
        }

        private XacmlJsonRequest CreateXacmlJsonRequest(AuthorizationHandlerContext context, AppAccessRequirement requirement)
        {
            XacmlJsonRequest request = new XacmlJsonRequest();

            // Subject
            request.AccessSubject.Add(CreateSubjectCategory(context.User.Claims));

            // Action
            request.Action.Add(CreateActionCategory(requirement.ActionType));

            // Resource
            request.Resource.Add(CreateResourceCategory(_httpContextAccessor.HttpContext.GetRouteData()));

            return request;
        }

        private XacmlJsonCategory CreateSubjectCategory(IEnumerable<Claim> claims)
        {
            XacmlJsonCategory subjectAttributes = new XacmlJsonCategory();

            // Mapping all claims on user to attributes
            foreach (Claim claim in claims)
            {
                subjectAttributes.Attribute.Add(CreateXacmlJsonAttribute(claim.Type, claim.ValueType, claim.Issuer, claim.Value));
            }

            return subjectAttributes;
        }

        private XacmlJsonCategory CreateActionCategory(string actionType)
        {
            XacmlJsonCategory actionAttributes = new XacmlJsonCategory();
            actionAttributes.Attribute.Add(CreateXacmlJsonAttribute(MatchAttributeIdentifiers.ActionId, actionType));
            return actionAttributes;
        }

        private XacmlJsonCategory CreateResourceCategory(RouteData routeData)
        {
            XacmlJsonCategory resourceAttributes = new XacmlJsonCategory();

            string instanceGuid = routeData.Values[ParamInstanceGuid] as string;
            string app = routeData.Values[ParamApp] as string;
            string org = routeData.Values[ParamOrg] as string;
            string instanceOwnerId = routeData.Values[ParamInstanceOwnerId] as string;

            // InstanceId
            resourceAttributes.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceInstanceId, instanceOwnerId + "/" + instanceGuid));

            // Org
            resourceAttributes.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceOrgId, org));

            // App
            resourceAttributes.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceAppId, app));

            return resourceAttributes;
        }

        private XacmlJsonAttribute CreateXacmlJsonAttribute(string attributeId, string value, string dataType = "string", string issuer = "altinn")
        {
            XacmlJsonAttribute xacmlJsonAttribute = new XacmlJsonAttribute();

            xacmlJsonAttribute.AttributeId = attributeId;
            xacmlJsonAttribute.DataType = dataType;
            xacmlJsonAttribute.Issuer = issuer;
            xacmlJsonAttribute.Value = value;

            return xacmlJsonAttribute;
        }

        /// <summary>
        /// Method that authorized the user for a instance access
        /// </summary>
        /// <param name="user">The authenticated user</param>
        /// <param name="instanceID">The instanceID</param>
        /// <param name="actionType">The action type to authorize against</param>
        /// <param name="requredAuthLevel">The required authentication level</param>
        /// <returns>Returns a boolean defining if user is authorized</returns>
        private bool AuthorizeAccess(ClaimsPrincipal user, Guid instanceID, string actionType, out int requredAuthLevel)
        {
            // TODO. Call Context Handler to get the following information
            // Who owns the instance, and what is the service for it
            // TODO Get the userID and authentication level from Claimsprincipal
            int currentAuthLevel = 0;
            foreach (Claim claim in user.Claims)
            {
                if (claim.Type.Equals(AltinnCoreClaimTypes.AuthenticationLevel))
                {
                    currentAuthLevel = Convert.ToInt32(claim.Value);
                }
            }

            if (currentAuthLevel < 2)
            {
                requredAuthLevel = 2;
            }
            else
            {
                requredAuthLevel = 0;
            }

            return true;
        }
    }
}
