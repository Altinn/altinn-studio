using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;

namespace Altinn.Common.PEP.Authorization
{
    /// <summary>
    /// Authorization handler that verifies that the user has a given claimtype with a given value
    /// from a given issuer
    /// </summary>
    public class ClaimAccessHandler : AuthorizationHandler<ClaimAccessRequirement>
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="AppAccessHandler"/> class.
        /// </summary>
        public ClaimAccessHandler()
        {
        }

        /// <summary>
        /// This method authorize access bases on context and requirement
        /// Is triggered by annotation on MVC action and setup in startup.
        /// </summary>
        /// <param name="context">The context</param>
        /// <param name="requirement">The requirement</param>
        /// <returns>No object or value is returned by this method when it completes.</returns>
        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, ClaimAccessRequirement requirement)
        {
            bool isAuthorized = false;
            if (context.User != null && context.User.Claims != null)
            {
                foreach (Claim claim in context.User.Claims)
                {
                    if (claim.Type.Equals(requirement.ClaimType)
                        && claim.Value.Equals(requirement.ClaimValue))
                    {
                        isAuthorized = true;
                        break;
                    }
                }
            }

            if (isAuthorized)
            {
                context.Succeed(requirement);
            }
            else
            {
                context.Fail();
            }

            await Task.CompletedTask;
        }
    }
}
