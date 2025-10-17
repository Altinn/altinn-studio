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
        private readonly HttpContext _httpContext;
        private readonly IUserOrganizationService _userOrganizationService;

        public OrganizationPermissionHandler(
            IHttpContextAccessor httpContextAccessor,
            IUserOrganizationService userOrganizationService
        )
        {
            _httpContext = httpContextAccessor.HttpContext;
            _userOrganizationService = userOrganizationService;
        }

        /// <inheritdoc/>
        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            OrganizationPermissionRequirement requirement
        )
        {
            if (_httpContext == null)
            {
                return;
            }

            string org = _httpContext.GetRouteValue("org")?.ToString();
            if (string.IsNullOrWhiteSpace(org))
            {
                _httpContext.Response.StatusCode = (int)HttpStatusCode.BadRequest;
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
