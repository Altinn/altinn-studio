namespace AltinnCore.Runtime.Authorization
{
    using System;
    using System.Security.Claims;
    using System.Threading.Tasks;
    using AltinnCore.Common.Constants;
    using AltinnCore.Common.Enums;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Mvc.Filters;

    /// <summary>
    /// AuthorizationHandler that is created for handling access to service instances.
    /// Authorizes based om InstanceAccessRequirement and instance id from route
    /// <see href="https://docs.asp.net/en/latest/security/authorization/policies.html"/> for details about authorization
    /// in asp.net core
    /// </summary>
    public class InstanceAccessHandler : AuthorizationHandler<InstanceAccessRequirement>
    {
        /// <summary>
        /// This method authorize access bases on context and requirement
        /// Is triggered by annotation on MVC action and setup in startup.
        /// </summary>
        /// <param name="context">The context</param>
        /// <param name="requirement">The requirement</param>
        /// <returns>A Task</returns>
        protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, InstanceAccessRequirement requirement)
        {
            if (context.Resource is AuthorizationFilterContext mvcContext)
            {
                if (Guid.TryParse(mvcContext.RouteData.Values["instanceId"] as string, out Guid instanceID))
                {
                    bool isAuthorized = AuthorizeAccess(context.User, instanceID, requirement.ActionType, out int requiredAuthenticationLevel);

                    if (isAuthorized && requiredAuthenticationLevel == 0)
                    {
                        context.Succeed(requirement);
                    }
                    else if (isAuthorized && requiredAuthenticationLevel > 0)
                    {
                        mvcContext.HttpContext.Items.Add("upgrade", true);
                        mvcContext.HttpContext.Items.Add("requiredLevel", requiredAuthenticationLevel);
                        context.Fail();
                    }
                    else
                    {
                        context.Fail();
                    }
                }
                else
                {
                    context.Fail();
                }
            }
            else
            {
                context.Fail();
            }

            return Task.CompletedTask;
        }

        /// <summary>
        /// Method that authorized the user for a instance access
        /// </summary>
        /// <param name="user">The authenticated user</param>
        /// <param name="instanceID">The instanceID</param>
        /// <param name="actionType">The action type to authorize against</param>
        /// <param name="requredAuthLevel">The required authentication level</param>
        /// <returns>Returns a boolean defining if user is authorized</returns>
        private bool AuthorizeAccess(ClaimsPrincipal user, Guid instanceID, ActionType actionType, out int requredAuthLevel)
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
