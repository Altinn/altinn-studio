using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Configuration;
using Altinn.Common.PEP.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;
using static Altinn.Authorization.ABAC.Constants.XacmlConstants;

namespace Altinn.Common.PEP.Authorization
{
    /// <summary>
    /// AuthorizationHandler that is created for handling access to app.
    /// Authorizes based om AppAccessRequirement and app id from route
    /// <see href="https://docs.asp.net/en/latest/security/authorization/policies.html"/> for details about authorization
    /// in asp.net core
    /// </summary>
    public class AppAccessHandler : AuthorizationHandler<AppAccessRequirement>
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IPDP _pdp;
        private readonly GeneralSettings _generalSettings;
        private const string XacmlResourceInstanceId = "urn:altinn:instance-id";
        private const string XacmlResourceOrgId = "urn:altinn:org";
        private const string XacmlResourceAppId = "urn:altinn:app";
        private const string ParamInstanceOwnerId = "instanceOwnerId";
        private const string ParamInstanceGuid = "instanceGuid";
        private const string ParamApp = "app";
        private const string ParamOrg = "org";
        private const string defaultIssuer = "Altinn";
        private const string defaultType = "string";

        /// <summary>
        /// Initializes a new instance of the <see cref="AppAccessHandler"/> class.
        /// </summary>
        /// <param name="httpContextAccessor">The http context accessor</param>
        /// <param name="pdp">The pdp</param>
        /// <param name="generalSettings">The general settings</param>
        public AppAccessHandler(
            IHttpContextAccessor httpContextAccessor,
            IPDP pdp,
            IOptions<GeneralSettings> generalSettings)
        {
            _httpContextAccessor = httpContextAccessor;
            _pdp = pdp;
            _generalSettings = generalSettings.Value;
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
            if (_generalSettings.DisablePEP)
            {
                context.Succeed(requirement);
                return;
            }

            XacmlJsonRequest request = CreateXacmlJsonRequest(context, requirement);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);

            if(response == null || response.Response == null)
            {
                context.Fail();
                return;
            }

            List<XacmlJsonResult> results = response.Response;

            // We request one thing and then only want one result
            if (results.Count != 1)
            {
                context.Fail();
            }

            // Checks that the result is nothing else than "permit"
            if (!results.First().Decision.Equals(XacmlContextDecision.Permit.ToString()))
            {
                context.Fail();
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
                    string usersAuthenticationLevel = context.User.Claims.FirstOrDefault(c => c.Type.Equals("AuthenticationLevel")).Value;

                    // Checks that the user meets the minimum authentication level
                    if (Convert.ToInt32(usersAuthenticationLevel) < Convert.ToInt32(minAuthenticationLevel))
                    {
                        context.Fail();
                    }
                }
            }

            context.Succeed(requirement);
            await Task.CompletedTask;
        }

        private XacmlJsonRequest CreateXacmlJsonRequest(AuthorizationHandlerContext context, AppAccessRequirement requirement)
        {
            XacmlJsonRequest request = new XacmlJsonRequest();

            request.AccessSubject = new List<XacmlJsonCategory>();
            request.Action = new List<XacmlJsonCategory>();
            request.Resource = new List<XacmlJsonCategory>();

            request.AccessSubject.Add(CreateSubjectCategory(context.User.Claims));
            request.Action.Add(CreateActionCategory(requirement.ActionType));
            request.Resource.Add(CreateResourceCategory(_httpContextAccessor.HttpContext.GetRouteData()));

            return request;
        }

        private XacmlJsonCategory CreateSubjectCategory(IEnumerable<Claim> claims)
        {
            XacmlJsonCategory subjectAttributes = new XacmlJsonCategory();
            subjectAttributes.Attribute = new List<XacmlJsonAttribute>();

            // Mapping all claims on user to attributes
            foreach (Claim claim in claims)
            {
                subjectAttributes.Attribute.Add(CreateXacmlJsonAttribute(claim.Type, claim.Value, claim.ValueType, claim.Issuer));
            }

            return subjectAttributes;
        }

        private XacmlJsonCategory CreateActionCategory(string actionType)
        {
            XacmlJsonCategory actionAttributes = new XacmlJsonCategory();
            actionAttributes.Attribute = new List<XacmlJsonAttribute>();
            actionAttributes.Attribute.Add(CreateXacmlJsonAttribute(MatchAttributeIdentifiers.ActionId, actionType, defaultType, defaultIssuer));
            return actionAttributes;
        }

        private XacmlJsonCategory CreateResourceCategory(RouteData routeData)
        {
            XacmlJsonCategory resourceAttributes = new XacmlJsonCategory();
            resourceAttributes.Attribute = new List<XacmlJsonAttribute>();

            string instanceGuid = routeData.Values[ParamInstanceGuid] as string;
            string app = routeData.Values[ParamApp] as string;
            string org = routeData.Values[ParamOrg] as string;
            string instanceOwnerId = routeData.Values[ParamInstanceOwnerId] as string;

            resourceAttributes.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceInstanceId, instanceOwnerId + "/" + instanceGuid, defaultType, defaultIssuer));
            resourceAttributes.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceOrgId, org, defaultType, defaultIssuer));
            resourceAttributes.Attribute.Add(CreateXacmlJsonAttribute(XacmlResourceAppId, app, defaultType, defaultIssuer));

            return resourceAttributes;
        }

        private XacmlJsonAttribute CreateXacmlJsonAttribute(string attributeId, string value, string dataType, string issuer)
        {
            XacmlJsonAttribute xacmlJsonAttribute = new XacmlJsonAttribute();

            xacmlJsonAttribute.AttributeId = attributeId;
            xacmlJsonAttribute.Value = value;
            xacmlJsonAttribute.DataType = dataType;
            xacmlJsonAttribute.Issuer = issuer;

            return xacmlJsonAttribute;
        }
    }
}
