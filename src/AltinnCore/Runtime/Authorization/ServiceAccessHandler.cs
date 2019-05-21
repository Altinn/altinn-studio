using System;
using System.Security.Claims;
using System.Threading.Tasks;
using AltinnCore.Authentication.Constants;
using AltinnCore.Common.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AltinnCore.Runtime.Authorization
{
    /// <summary>
    /// Authorization handler that
    /// </summary>
    public class ServiceAccessHandler : AuthorizationHandler<ServiceAccessRequirement>
    {
        /// <summary>
        /// This method handles authorization scenarios where access is controlled by the
        /// </summary>
        /// <param name="context">The AuthorizationHandlerContext</param>
        /// <param name="requirement">The given requirement</param>
        /// <returns>The Task</returns>
        protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, ServiceAccessRequirement requirement)
        {
            if (context.Resource is AuthorizationFilterContext mvcContext)
            {
                string org = mvcContext.RouteData.Values["org"] as string;
                string service = mvcContext.RouteData.Values["service"] as string;
                string reportee = mvcContext.RouteData.Values["reportee"] as string;

                if (!string.IsNullOrEmpty(org) && !string.IsNullOrEmpty(service) && !string.IsNullOrEmpty(reportee))
                {
                    bool isAuthorized = AuthorizeAccess(context.User, reportee, org, service, requirement.ActionType, out int reqAuthLevel);

                    if (isAuthorized && reqAuthLevel == 0)
                    {
                        context.Succeed(requirement);
                    }
                    else if (isAuthorized && reqAuthLevel > 0)
                    {
                        mvcContext.HttpContext.Items.Add("upgrade", true);
                        mvcContext.HttpContext.Items.Add("requiredLevel", reqAuthLevel);
                        context.Fail();
                    }
                    else
                    {
                        context.Fail();
                    }
                }
            }
            else
            {
                context.Fail();
            }

            return Task.CompletedTask;
        }

        private bool AuthorizeAccess(ClaimsPrincipal user, string reportee, string org, string service, ActionType actionType, out int requiredAuthLevel)
        {
            // TODO Call Decision point
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
                requiredAuthLevel = 2;
            }
            else
            {
                requiredAuthLevel = 0;
            }

            return true;
        }
    }
}
