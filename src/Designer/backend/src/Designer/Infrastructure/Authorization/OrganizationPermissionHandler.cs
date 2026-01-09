using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Infrastructure.Authorization
{
    /// <summary>
    /// Authorization Handler for OrganizationAdminPermissionRequirement
    /// </summary>
    public class OrganizationPermissionHandler
        : AuthorizationHandler<OrganizationPermissionRequirement>
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IUserOrganizationService _userOrganizationService;

        public OrganizationPermissionHandler(
            IHttpContextAccessor httpContextAccessor,
            IUserOrganizationService userOrganizationService
        )
        {
            _httpContextAccessor = httpContextAccessor;
            _userOrganizationService = userOrganizationService;
        }

        /// <inheritdoc/>
        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            OrganizationPermissionRequirement requirement
        )
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null)
            {
                return;
            }

            string? org = httpContext.GetRouteValue("org")?.ToString();
            if (string.IsNullOrWhiteSpace(org))
            {
                httpContext.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                return;
            }

            var userIsMember = await _userOrganizationService.UserIsMemberOfOrganization(org);
            if (userIsMember)
            {
                context.Succeed(requirement);
            }
            else
            {
                context.Fail();
            }
        }
    }
}
