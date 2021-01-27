using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.ViewModels.Request;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Infrastructure.Authorization
{
    /// <summary>
    /// Authorization Handler for GiteaPushPermissionRequirement
    /// </summary>
    public class GiteaPushPermissionHandler : AuthorizationHandler<GiteaPushPermissionRequirement>
    {
        private readonly IGitea _giteaApiWrapper;
        private readonly HttpContext _httpContext;
        private readonly GeneralSettings _settings;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="giteaApiWrapper">IGitea</param>
        /// <param name="httpContextAccessor">IHttpContextAccessor</param>
        /// <param name="settings">The general settings</param>
        public GiteaPushPermissionHandler(
            IGitea giteaApiWrapper,
            IHttpContextAccessor httpContextAccessor,
            IOptions<GeneralSettings> settings)
        {
            _httpContext = httpContextAccessor.HttpContext;
            _giteaApiWrapper = giteaApiWrapper;
            _settings = settings.Value;
        }

        /// <inheritdoc/>
        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            GiteaPushPermissionRequirement requirement)
        {
            Console.WriteLine($"////// middleware triggered");
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

            Console.WriteLine($"//////////////////// Check membership: {_settings.CheckTeamMembershipForDeploy}");

            if (_settings.CheckTeamMembershipForDeploy)
            {
                string environment;

                _httpContext.Request.EnableBuffering();

                using (var reader = new StreamReader(
                   _httpContext.Request.Body,
                   encoding: Encoding.UTF8,
                   detectEncodingFromByteOrderMarks: false,
                   bufferSize: 1024,
                   leaveOpen: true))
                {
                    string body = await reader.ReadToEndAsync();

                    try
                    {
                        CreateDeploymentRequestViewModel model = JsonConvert.DeserializeObject<CreateDeploymentRequestViewModel>(body);
                        environment = model.Environment.Name;
                    }
                    catch
                    {
                        reader.Close();
                        _httpContext.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                        return;
                    }

                    // Reset the request body stream position so the next middleware can read it
                    _httpContext.Request.Body.Position = 0;
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

                return;
            }

            RepositoryClient.Model.Repository repository = await _giteaApiWrapper.GetRepository(org, app);
            if (repository?.Permissions?.Push == true ||
                repository?.Permissions?.Admin == true)
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
