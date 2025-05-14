using Altinn.App.Core.Constants;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Extensions;

internal static class NationalIdentityNumberExtensions
{
    /// <summary>
    /// Returns a string representation of the <see cref="NationalIdentityNumber"/>, prefixed with the <see cref="AltinnUrns.PersonId"/> URN value
    /// </summary>
    public static string ToUrnFormattedString(this NationalIdentityNumber identityNumber)
    {
        return $"{AltinnUrns.PersonId}:{identityNumber}";
    }

    /// <summary>
    /// Returns a string representation of the <see cref="NationalIdentityNumber"/>, prefixed with the <see cref="AltinnUrns.PersonId"/> URN value, if the value is not null.
    /// </summary>
    public static string? ToUrnFormattedString(this NationalIdentityNumber? identityNumber)
    {
        return identityNumber is null ? null : $"{AltinnUrns.PersonId}:{identityNumber}";
    }
}
