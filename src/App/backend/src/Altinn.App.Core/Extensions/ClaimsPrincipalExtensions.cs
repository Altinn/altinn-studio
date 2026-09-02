using System.Globalization;
using System.Security.Claims;
using AltinnCore.Authentication.Constants;

namespace Altinn.App.Core.Extensions;

/// <summary>
/// This class holds a collection of extension methods for the <see cref="ClaimsPrincipal"/> class.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Gets the userId or the orgNumber or null if neither claims are present.
    /// </summary>
    public static string? GetUserOrOrgId(this ClaimsPrincipal user)
    {
        int? userId = GetUserIdAsInt(user);
        if (userId.HasValue)
        {
            return userId.Value.ToString(CultureInfo.InvariantCulture);
        }

        int? orgId = GetOrgNumber(user);
        if (orgId.HasValue)
        {
            return orgId.Value.ToString(CultureInfo.InvariantCulture);
        }

        return null;
    }

    /// <summary>
    /// Get the org identifier string or null if it is not an org.
    /// </summary>
    public static string? GetOrg(this ClaimsPrincipal user) => user.GetFirstOfType(AltinnCoreClaimTypes.Org);

    /// <summary>
    /// Returns the organization number of an org user or null if claim does not exist.
    /// </summary>
    public static int? GetOrgNumber(this ClaimsPrincipal? user) =>
        user.GetFirstOfTypeAsInt(AltinnCoreClaimTypes.OrgNumber);

    /// <summary>
    /// Return the userId as an int or null if UserId claim is not set
    /// </summary>
    public static int? GetUserIdAsInt(this ClaimsPrincipal? user) =>
        user.GetFirstOfTypeAsInt(AltinnCoreClaimTypes.UserId);

    /// <summary>
    /// Returns the authentication level of the user.
    /// </summary>
    public static int GetAuthenticationLevel(this ClaimsPrincipal user) =>
        user.GetFirstOfTypeAsInt(AltinnCoreClaimTypes.AuthenticationLevel) ?? 0;

    /// <summary>
    /// Return the partyId as an int or null if PartyId claim is not set
    /// </summary>
    public static int? GetPartyIdAsInt(this ClaimsPrincipal user) =>
        user.GetFirstOfTypeAsInt(AltinnCoreClaimTypes.PartyID);

    private static string? GetFirstOfType(this ClaimsPrincipal? user, string type) =>
        user?.FindFirst(c => c.Type == type)?.Value;

    private static int? GetFirstOfTypeAsInt(this ClaimsPrincipal? user, string type) =>
        int.TryParse(user.GetFirstOfType(type), out var v) ? v : null;
}
