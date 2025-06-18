using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace Altinn.Studio.Designer.Infrastructure.Authorization;

public class BelongsToOrgHandler : AuthorizationHandler<BelongsToOrgRequirement>
{
    private readonly IGitea _giteaService;

    public BelongsToOrgHandler(IGitea giteaService)
    {
        _giteaService = giteaService;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context,
        BelongsToOrgRequirement requirement)
    {
        if (IsNotAuthenticatedUser(context))
        {
            context.Fail();
            return;
        }

        if (await UserBelongsToOrg())
        {
            context.Succeed(requirement);
        }
        else
        {
            context.Fail();
        }
    }

    private static bool IsNotAuthenticatedUser(AuthorizationHandlerContext context)
    {
        return context.User?.Identity?.IsAuthenticated != true;
    }

    private async Task<bool> UserBelongsToOrg()
    {
        var organizations = await _giteaService.GetUserOrganizations();
        return organizations.Count > 0;
    }
}
