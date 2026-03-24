using System;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Infrastructure.Authorization;

public class OrgOwnerHandler(IHttpContextAccessor httpContextAccessor, IGiteaClient giteaClient)
    : AuthorizationHandler<OrgOwnerRequirement>
{
    private const string OwnersTeamName = "Owners";

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        OrgOwnerRequirement requirement
    )
    {
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext == null)
        {
            return;
        }

        string? org = httpContext.GetRouteValue("org")?.ToString();
        if (string.IsNullOrWhiteSpace(org))
        {
            httpContext.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            context.Fail();
            return;
        }

        var teams = await giteaClient.GetTeams();
        if (teams == null)
        {
            context.Fail();
            return;
        }

        bool isOwner = teams.Any(t =>
            t.Organization.Username.Equals(org, StringComparison.OrdinalIgnoreCase)
            && t.Name.Equals(OwnersTeamName, StringComparison.OrdinalIgnoreCase)
        );

        if (isOwner)
        {
            context.Succeed(requirement);
        }
        else
        {
            context.Fail();
        }
    }
}
