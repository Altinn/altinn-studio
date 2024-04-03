using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Infrastructure.Authorization
{
    /// <summary>
    /// Authorization Handler for GiteaDeployResourcePermissionRequirement
    /// </summary>
    public class GiteaDeployResourcePermissionHandler : AuthorizationHandler<GiteaDeployResourcePermissionRequirement>
    {
        private readonly IGitea _giteaApiWrapper;
        private readonly HttpContext _httpContext;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="giteaApiWrapper">IGitea</param>
        /// <param name="httpContextAccessor">IHttpContextAccessor</param>
        public GiteaDeployResourcePermissionHandler(
            IGitea giteaApiWrapper,
            IHttpContextAccessor httpContextAccessor)
        {
            _httpContext = httpContextAccessor.HttpContext;
            _giteaApiWrapper = giteaApiWrapper;
        }

        /// <inheritdoc/>
        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            GiteaDeployResourcePermissionRequirement requirement)
        {
            if (_httpContext == null)
            {
                return;
            }

            string org = _httpContext.GetRouteValue("org")?.ToString();
            string environment = _httpContext.Request.Query["env"];
            if (string.IsNullOrWhiteSpace(org) || string.IsNullOrWhiteSpace(environment))
            {
                _httpContext.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                return;
            }

            string matchTeam = environment == "prod" ? "Resource-Publish-Prod" : "Resource-Publish-Test";
            List<Team> teams = await _giteaApiWrapper.GetTeams();

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
                _httpContext.Response.StatusCode = (int)HttpStatusCode.Forbidden;
            }
        }
    }
}
