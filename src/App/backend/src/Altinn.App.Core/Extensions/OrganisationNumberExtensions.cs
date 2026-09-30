using Altinn.App.Core.Constants;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Extensions;

internal static class OrganizationNumberExtensions
{
    /// <summary>
    /// Returns a string representation of the <see cref="OrganizationNumber"/>, prefixed with the <see cref="AltinnUrns.OrganizationNumber"/> URN value
    /// </summary>
    public static string ToUrnFormattedString(this OrganizationNumber organizationNumber)
    {
        return $"{AltinnUrns.OrganizationNumber}:{organizationNumber.Get(OrganizationNumberFormat.Local)}";
    }

    /// <summary>
    /// Returns a string representation of the <see cref="OrganizationNumber"/>, prefixed with the <see cref="AltinnUrns.OrganizationNumber"/> URN value, if the value is not null.
    /// </summary>
    public static string? ToUrnFormattedString(this OrganizationNumber? organizationNumber)
    {
        return organizationNumber is null
            ? null
            : $"{AltinnUrns.OrganizationNumber}:{organizationNumber.Value.Get(OrganizationNumberFormat.Local)}";
    }
}
