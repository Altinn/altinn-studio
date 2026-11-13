namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Tells the frontend whether to show the platform-wide admin pages. The policy on their endpoints is the real
/// protection.
/// </summary>
public class UserPlatformPermission
{
    public required bool HasPlatformAccess { get; init; }
}
