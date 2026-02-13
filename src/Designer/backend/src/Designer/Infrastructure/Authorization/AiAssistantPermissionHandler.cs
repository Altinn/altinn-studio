#nullable disable
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace Altinn.Studio.Designer.Infrastructure.Authorization;

public class AiAssistantPermissionHandler : AuthorizationHandler<AiAssistantPermissionRequirement>
{
    private readonly IUserOrganizationService _userOrganizationService;

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

        // Will change as we give more organisations access.
        // To do: Move allowed organisations into a list of strings.
        bool isMemberOfTtd = await _userOrganizationService.UserIsMemberOfOrganization("ttd");
        if (isMemberOfTtd)
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
