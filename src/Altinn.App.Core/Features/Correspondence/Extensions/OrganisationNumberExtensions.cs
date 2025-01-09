using Altinn.App.Core.Constants;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Extensions;

internal static class OrganisationNumberExtensions
{
    /// <summary>
    /// Returns a string representation of the <see cref="OrganisationNumber"/>, prefixed with the <see cref="AltinnUrns.OrganisationNumber"/> URN value
    /// </summary>
    public static string ToUrnFormattedString(this OrganisationNumber organisationNumber)
    {
        return $"{AltinnUrns.OrganisationNumber}:{organisationNumber.Get(OrganisationNumberFormat.Local)}";
    }
}
