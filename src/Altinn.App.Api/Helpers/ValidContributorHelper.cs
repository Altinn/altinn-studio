using System.Globalization;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Helpers;

/// <summary>
/// Helper class for validating if a user is a valid contributor to a data type.
/// </summary>
/// <remarks>
/// The concept of inline authorization of valid contributors is not widely used and is likely not the best approach for doing authorization on the data type level, but there is no support for it yet in the policy based authorization, so keeping for now.
/// </remarks>
internal static class ValidContributorHelper
{
    internal static bool IsValidContributor(DataType dataType, string? org, int? orgNr)
    {
        if (dataType.AllowedContributers is null || dataType.AllowedContributers.Count == 0)
        {
            return true;
        }

        foreach (string item in dataType.AllowedContributers)
        {
            string key = item.Split(':')[0];
            string value = item.Split(':')[1];

            switch (key.ToLowerInvariant())
            {
                case "org":
                    if (value.Equals(org, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }

                    break;
                case "orgno":
                    if (value.Equals(orgNr?.ToString(CultureInfo.InvariantCulture), StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }

                    break;
            }
        }

        return false;
    }
}
