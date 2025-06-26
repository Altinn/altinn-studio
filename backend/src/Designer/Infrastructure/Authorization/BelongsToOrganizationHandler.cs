using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace Altinn.Studio.Designer.Infrastructure.Authorization;

public class BelongsToOrganizationHandler : AuthorizationHandler<BelongsToOrganizationRequirement>
{
    private readonly IUserOrganizationService _userOrganizationService;

    public BelongsToOrganizationHandler(IUserOrganizationService userOrganizationService)
    {
        _userOrganizationService = userOrganizationService;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context,
        BelongsToOrganizationRequirement requirement)
    {
        if (IsNotAuthenticatedUser(context))
        {
            context.Fail();
            return;
        }

        bool isMemberOfOrganization = await _userOrganizationService.UserIsMemberOfAnyOrganization();
        if (isMemberOfOrganization)
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
}
