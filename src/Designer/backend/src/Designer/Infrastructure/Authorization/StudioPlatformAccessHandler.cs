using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace Altinn.Studio.Designer.Infrastructure.Authorization;

/// <summary>
/// Grants <see cref="StudioPlatformAccessRequirement"/> to members of the platform access team. Unlike the admin
/// permission, it does not depend on an org or environment in the route.
/// </summary>
public class StudioPlatformAccessHandler : AuthorizationHandler<StudioPlatformAccessRequirement>
{
    private readonly IStudioPlatformAccessService _platformAccessService;

    public StudioPlatformAccessHandler(IStudioPlatformAccessService platformAccessService)
    {
        _platformAccessService = platformAccessService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        StudioPlatformAccessRequirement requirement
    )
    {
        if (await _platformAccessService.HasPlatformAccessAsync())
        {
            context.Succeed(requirement);
        }
        else
        {
            context.Fail();
        }
    }
}
