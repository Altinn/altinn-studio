#nullable disable
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace Altinn.Studio.Designer.Infrastructure.Authorization;

public class MemberOfAnyOrganizationHandler : AuthorizationHandler<MemberOfAnyOrganizationRequirement>
{
    private readonly IUserOrganizationService _userOrganizationService;

    public MemberOfAnyOrganizationHandler(IUserOrganizationService userOrganizationService)
    {
        _userOrganizationService = userOrganizationService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        MemberOfAnyOrganizationRequirement requirement
    )
    {
        if (IsNotAuthenticatedUser(context))
        {
            context.Fail();
            return;
        }

        bool isMemberOfAnyOrganization = await _userOrganizationService.UserIsMemberOfAnyOrganization();
        if (isMemberOfAnyOrganization)
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
