using System.Security.Claims;

namespace Altinn.Studio.Designer.Infrastructure.StudioOidc;

public static class StudioAuthenticationProviders
{
    public const string ClaimType = "studio:authentication_provider";
    public const string Ansattporten = "ansattporten";
    public const string Mockporten = "mockporten";
    public const string MockportenScheme = "Mockporten";
    public const string MockportenPidHashClaim = "studio:mockporten_pid_hash";
    public const string TestOrganization = "ttd";

    public static bool IsMockporten(ClaimsPrincipal user) => user.HasClaim(ClaimType, Mockporten);
}
