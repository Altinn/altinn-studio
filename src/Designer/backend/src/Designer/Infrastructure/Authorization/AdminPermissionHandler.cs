using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Infrastructure.Authorization
{
    /// <summary>
    /// Authorization Handler for AdminPermissionRequirement
    /// </summary>
    public class AdminPermissionHandler : AuthorizationHandler<AdminPermissionRequirement>
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IGiteaClient _giteaClient;

        public AdminPermissionHandler(
            IHttpContextAccessor httpContextAccessor,
            IGiteaClient giteaClient
        )
        {
            _httpContextAccessor = httpContextAccessor;
            _giteaClient = giteaClient;
        }

        /// <inheritdoc/>
        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            AdminPermissionRequirement requirement
        )
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null)
            {
                return;
            }

            string? org = httpContext.GetRouteValue("org")?.ToString();
            string? env = httpContext.GetRouteValue("env")?.ToString();
            if (string.IsNullOrWhiteSpace(org) || string.IsNullOrWhiteSpace(env))
            {
                httpContext.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                return;
            }

            string matchTeam = $"Admin-{env}";
            List<Team>? teams = await _giteaClient.GetTeams();
            if (teams == null)
            {
                context.Fail();
                return;
            }

            bool isInTeam = teams.Any(t =>
                t.Organization.Username.Equals(org, System.StringComparison.OrdinalIgnoreCase)
                && t.Name.Equals(matchTeam, System.StringComparison.OrdinalIgnoreCase)
            );

            if (isInTeam)
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
