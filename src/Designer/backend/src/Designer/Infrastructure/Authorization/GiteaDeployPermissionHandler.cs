#nullable disable
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Infrastructure.Authorization;

/// <summary>
/// Authorization Handler for GiteaDeployPermissionRequirement
/// </summary>
public class GiteaDeployPermissionHandler : AuthorizationHandler<GiteaDeployPermissionRequirement>
{
    private readonly IGiteaClient _giteaClient;
    private readonly HttpContext _httpContext;

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="giteaClient">IGiteaClient</param>
    /// <param name="httpContextAccessor">IHttpContextAccessor</param>
    public GiteaDeployPermissionHandler(IGiteaClient giteaClient, IHttpContextAccessor httpContextAccessor)
    {
        _httpContext = httpContextAccessor.HttpContext;
        _giteaClient = giteaClient;
    }

    /// <inheritdoc/>
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        GiteaDeployPermissionRequirement requirement
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

        string environment = _httpContext.GetRouteValue("environment")?.ToString();

        if (string.IsNullOrEmpty(environment))
        {
            _httpContext.Request.EnableBuffering();

            using (
                var reader = new StreamReader(
                    _httpContext.Request.Body,
                    encoding: Encoding.UTF8,
                    detectEncodingFromByteOrderMarks: false,
                    bufferSize: 1024,
                    leaveOpen: true
                )
            )
            {
                try
                {
                    string body = await reader.ReadToEndAsync();
                    environment = EnvironmentInBody(body);
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
        List<Team> teams = await _giteaClient.GetTeams();

        bool any = teams.Any(t =>
            t.Organization.Username.Equals(org, System.StringComparison.OrdinalIgnoreCase)
            && t.Name.Equals(matchTeam, System.StringComparison.OrdinalIgnoreCase)
        );

        if (any)
        {
            context.Succeed(requirement);
        }
        else
        {
            _httpContext.Response.StatusCode = (int)HttpStatusCode.Forbidden;
        }
    }

    /// <summary>
    /// Reads the environment the request acts on the way model binding does, which matches property names without
    /// regard to case. A body that names it more than once, in any case or under both names, is rejected, since the
    /// permission checked here and the environment the endpoint acts on could then differ.
    /// </summary>
    private static string EnvironmentInBody(string body)
    {
        // Throws on property names that differ only in case, which model binding would both accept.
        JsonNode bodyJson = JsonNode.Parse(body, new JsonNodeOptions { PropertyNameCaseInsensitive = true });
        string[] environments = new[] { bodyJson?["envName"], bodyJson?["environment"] }
            .Where(node => node is not null)
            .Select(node => node.ToString())
            .ToArray();
        if (environments.Length > 1)
        {
            throw new JsonException("The body names the environment more than once.");
        }

        return environments.SingleOrDefault();
    }
}
