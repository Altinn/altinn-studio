#nullable enable

using System;
using System.Security.Claims;
using System.Text.Json;

using Altinn.AccessManagement.Core.Models;
using AltinnCore.Authentication.Constants;

namespace Altinn.Platform.Storage.Helpers;

/// <summary>
/// Helper methods on the ClaimsPrincipal class to get user information from different claims.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Looks for any service owner related scopes and return true if any are found, otherwise false.
    /// </summary>
    /// <param name="user">The ClaimsPrincipal to check for scopes delegated to service owners.</param>
    public static bool HasServiceOwnerScope(this ClaimsPrincipal user)
    {
        string? scope = user.FindFirstValue("scope");

        return scope is not null && scope.Contains("altinn:serviceowner");
    }

    /// <summary>
    /// Gets the userId or the orgNumber or null if neither claims are present.
    /// </summary>
    public static string? GetUserOrOrgNo(this ClaimsPrincipal user)
    {
        int? userId = GetUserId(user);
        if (userId.HasValue)
        {
            return userId.Value.ToString();
        }

        var systemUser = GetSystemUser(user);
        if (systemUser is not null)
        {
            return GetSystemUserOwner(user);
        }

        string? orgNo = GetOrgNumber(user);
        if (orgNo is not null)
        {
            return orgNo;
        }

        return null;
    }

    /// <summary>
    /// Returns the value of the org claim if found. Otherwise null.
    /// </summary>
    /// <param name="user">The ClaimsPrincipal to check for the org claim value.</param>
    public static string? GetOrg(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(AltinnCoreClaimTypes.Org);
    }

    /// <summary>
    /// Returns the value of the organization number claim if found. Otherwise null.
    /// </summary>
    /// <param name="user">The ClaimsPrincipal to check for the organization number claim value.</param>
    public static string? GetOrgNumber(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(AltinnCoreClaimTypes.OrgNumber);
    }

    /// <summary>
    /// Return the value of the user id claim as an int if found. Otherwise null.
    /// </summary>
    /// <param name="user">The ClaimsPrincipal to check for the UserId claim value.</param>
    public static int? GetUserId(this ClaimsPrincipal user)
    {
        string? claimValue = user.FindFirstValue(AltinnCoreClaimTypes.UserId);
        if (claimValue is not null && int.TryParse(claimValue, out int userId))
        {
            return userId;
        }

        return null;
    }

    /// <summary>
    /// Return the SystemUserClaim value of the authorization_details claim if found. Otherwise null.
    /// </summary>
    /// <param name="user">The ClaimsPrincipal to check for the claim value.</param>
    public static SystemUserClaim? GetSystemUser(this ClaimsPrincipal user)
    {
        string? authorizationDetailsValue = user.FindFirstValue("authorization_details");
        if (authorizationDetailsValue is null)
        {
            return null;
        }

        return JsonSerializer.Deserialize<SystemUserClaim>(authorizationDetailsValue);
    }

    /// <summary>
    /// Gets the organization number of the owner of the system user if found. Otherwise null.
    /// </summary>
    /// <param name="user">The ClaimsPrincipal to check for the system user claim value.</param>
    public static Guid? GetSystemUserId(this ClaimsPrincipal user)
    {
        SystemUserClaim? systemUser = GetSystemUser(user);
        if (systemUser is not null)
        {
            string systemUserId = systemUser.Systemuser_id[0];
            if (Guid.TryParse(systemUserId, out Guid systemUserIdGuid))
            {
                return systemUserIdGuid;
            }
        }

        return null;
    }

    /// <summary>
    /// Gets the organization number of the owner of the system user if found. Otherwise null.
    /// </summary>
    /// <param name="user">The ClaimsPrincipal to check for the system user claim value.</param>
    public static string? GetSystemUserOwner(this ClaimsPrincipal user)
    {
        SystemUserClaim? systemUser = GetSystemUser(user);
        if (systemUser is not null)
        {
            string consumerAuthority = systemUser.Systemuser_org.Authority;
            if (!"iso6523-actorid-upis".Equals(consumerAuthority))
            {
                return null;
            }

            string consumerId = systemUser.Systemuser_org.ID;

            string organisationNumber = consumerId.Split(":")[1];
            return organisationNumber;
        }

        return null;
    }

    /// <summary>
    /// Returns the value of the authentication level claim if found. Otherwise 0.
    /// </summary>
    /// <param name="user">The ClaimsPrincipal to check for the authentication level claim value.</param>
    public static int GetAuthenticationLevel(this ClaimsPrincipal user)
    {
        string? claimValue = user.FindFirstValue(AltinnCoreClaimTypes.AuthenticationLevel);
        if (claimValue is not null && int.TryParse(claimValue, out int authenticationLevel))
        {
            return authenticationLevel;
        }

        return 0;
    }
}