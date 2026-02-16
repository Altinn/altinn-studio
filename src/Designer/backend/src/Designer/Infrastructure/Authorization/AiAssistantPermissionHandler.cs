using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace Altinn.Studio.Designer.Infrastructure.Authorization;

public class AiAssistantPermissionHandler : AuthorizationHandler<AiAssistantPermissionRequirement>
{
    private readonly IUserOrganizationService _userOrganizationService;

    private static readonly List<string> s_allowedOrganizations = ["ttd"];

    public AiAssistantPermissionHandler(IUserOrganizationService userOrganizationService)
    {
        _userOrganizationService = userOrganizationService;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context,
        AiAssistantPermissionRequirement requirement)
    {
        if (IsNotAuthenticatedUser(context))
        {
            context.Fail();
            return;
        }

        if (await _userOrganizationService.UserIsMemberOfAnyOf(s_allowedOrganizations))
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
