using Microsoft.AspNetCore.Authorization;

namespace Altinn.Studio.Designer.Infrastructure.Authorization;

/// <summary>
/// Authorization requirement for validating that an Ansattporten-authenticated user
/// has reportee access to the organization associated with the current request.
/// </summary>
public sealed class AnsattPortenOrgAccessRequirement : IAuthorizationRequirement
{
}
