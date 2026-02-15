#nullable disable
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
    /// Authorization Handler for GiteaPublishResourcePermissionRequirement
    /// </summary>
    public class GiteaPublishResourcePermissionHandler : AuthorizationHandler<GiteaPublishResourcePermissionRequirement>
    {
        private readonly IGiteaClient _giteaClient;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="giteaClient">IGiteaClient</param>
        /// <param name="httpContextAccessor">IHttpContextAccessor</param>
        public GiteaPublishResourcePermissionHandler(
            IGiteaClient giteaClient,
            IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
            _giteaClient = giteaClient;
        }

        /// <inheritdoc/>
        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            GiteaPublishResourcePermissionRequirement requirement)
        {
            if (_httpContextAccessor.HttpContext == null)
            {
                return;
            }

            string org = _httpContextAccessor.HttpContext.GetRouteValue("org")?.ToString();
            string environment = _httpContextAccessor.HttpContext.GetRouteValue("env")?.ToString();
            if (string.IsNullOrWhiteSpace(org) || string.IsNullOrWhiteSpace(environment))
            {
                _httpContextAccessor.HttpContext.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                return;
            }

            string matchTeam = $"Resources-Publish-{environment}";
            List<Team> teams = await _giteaClient.GetTeams();

            bool isTeamMember = teams.Any(t =>
                t.Organization.Username.Equals(org, System.StringComparison.OrdinalIgnoreCase) &&
                t.Name.Equals(matchTeam, System.StringComparison.OrdinalIgnoreCase)
            );

            if (isTeamMember)
            {
                context.Succeed(requirement);
            }
            else
            {
                _httpContextAccessor.HttpContext.Response.StatusCode = (int)HttpStatusCode.Forbidden;
            }
        }
    }
}
