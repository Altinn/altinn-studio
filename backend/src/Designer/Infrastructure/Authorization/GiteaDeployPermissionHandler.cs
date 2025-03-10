using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Infrastructure.Authorization
{
    /// <summary>
    /// Authorization Handler for GiteaDeployPermissionRequirement
    /// </summary>
    public class GiteaDeployPermissionHandler : AuthorizationHandler<GiteaDeployPermissionRequirement>
    {
        private readonly IGitea _giteaApiWrapper;
        private readonly HttpContext _httpContext;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="giteaApiWrapper">IGitea</param>
        /// <param name="httpContextAccessor">IHttpContextAccessor</param>
        public GiteaDeployPermissionHandler(
            IGitea giteaApiWrapper,
            IHttpContextAccessor httpContextAccessor)
        {
            _httpContext = httpContextAccessor.HttpContext;
            _giteaApiWrapper = giteaApiWrapper;
        }

        /// <inheritdoc/>
        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            GiteaDeployPermissionRequirement requirement)
        {
            if (_httpContext == null)
            {
                return;
            }

            string org = _httpContext.GetRouteValue("org")?.ToString();
            string app = _httpContext.GetRouteValue("app")?.ToString();

            if (string.IsNullOrWhiteSpace(org) ||
                string.IsNullOrWhiteSpace(app))
            {
                _httpContext.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                return;
            }

            string environment = _httpContext.GetRouteValue("environment")?.ToString();

            if (string.IsNullOrEmpty(environment))
            {
                _httpContext.Request.EnableBuffering();

                using (var reader = new StreamReader(
                   _httpContext.Request.Body,
                   encoding: Encoding.UTF8,
                   detectEncodingFromByteOrderMarks: false,
                   bufferSize: 1024,
                   leaveOpen: true))
                {
                    try
                    {
                        string body = await reader.ReadToEndAsync();
                        JsonNode bodyJson = JsonNode.Parse(body);

                        if (bodyJson["envName"] is not null)
                        {
                            environment = bodyJson["envName"].ToString();
                        }
                        if (bodyJson["environment"] is not null)
                        {
                            environment = bodyJson["environment"].ToString();
                        }
                    }
                    catch
                    {
                        _httpContext.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                        return;
                    }
                    reader.Close();
                    // Reset the request body stream position so the next middleware can read it
                    _httpContext.Request.Body.Position = 0;
                }
            }

            string matchTeam = $"Deploy-{environment}";
            List<Team> teams = await _giteaApiWrapper.GetTeams();

            bool any = teams.Any(t => t.Organization.Username.Equals(
                org, System.StringComparison.OrdinalIgnoreCase)
                && t.Name.Equals(matchTeam, System.StringComparison.OrdinalIgnoreCase));

            if (any)
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
