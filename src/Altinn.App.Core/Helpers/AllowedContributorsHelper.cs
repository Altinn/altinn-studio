using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Helpers;

internal static class AllowedContributorsHelper
{
    internal static bool IsValidContributor(DataType dataType, Authenticated auth)
    {
#pragma warning disable CS0618 // Type or member is obsolete
        List<string>? allowedContributors = dataType.AllowedContributers;
#pragma warning restore CS0618 // Type or member is obsolete

        if (allowedContributors is null || allowedContributors.Count == 0)
        {
            allowedContributors = dataType.AllowedContributors;
        }

        if (allowedContributors is null || allowedContributors.Count == 0)
        {
            return true;
        }

        var (org, orgNr) = auth switch
        {
            // System users also have 'orgno',  but this feature was originally intended
            // to let a service owner "own" a specific data type, so we haven't extended this
            Authenticated.ServiceOwner a => (a.Name, a.OrgNo),
            _ => (null, null),
        };

        foreach (string item in allowedContributors)
        {
            var splitIndex = item.IndexOf(':');
            ReadOnlySpan<char> key = item.AsSpan(0, splitIndex);
            ReadOnlySpan<char> value = item.AsSpan(splitIndex + 1);

            if (key.Equals("org", StringComparison.OrdinalIgnoreCase))
            {
                if (org is null)
                    continue;

                if (value.Equals(org, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            else if (key.Equals("orgno", StringComparison.OrdinalIgnoreCase))
            {
                if (orgNr is null)
                    continue;

                if (value.Equals(orgNr, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
        }

        return false;
    }

    public static void EnsureDataTypeIsAppOwned(ApplicationMetadata metadata, string? dataTypeId)
    {
        if (dataTypeId is null)
        {
            return;
        }

        DataType dataType =
            metadata.DataTypes.Find(x => x.Id == dataTypeId)
            ?? throw new ApplicationConfigException($"Data type {dataTypeId} not found in applicationmetadata.json");
#pragma warning disable CS0618 // Type or member is obsolete
        List<string>? allowedContributors = dataType.AllowedContributers;
#pragma warning restore CS0618 // Type or member is obsolete

        if (allowedContributors is null || allowedContributors.Count == 0)
        {
            allowedContributors = dataType.AllowedContributors;
        }

        if (
            allowedContributors is null
            || !(allowedContributors.Count == 1 && allowedContributors.Contains("app:owned"))
        )
        {
            throw new ApplicationConfigException(
                $"AllowedContributors (or AllowedContributers) must be set to ['app:owned'] on the data type ${dataType.Id}. This is to prevent editing of the data type through the API."
            );
        }
    }
}
