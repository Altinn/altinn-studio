using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Holds the single definition of which environments an organization's resource registry resources
/// apply to. Both the Designer frontend and the rest of the backend read the environments from here,
/// so the rule only has to be changed in one place.
/// </summary>
public class ResourceEnvironmentsService : IResourceEnvironmentsService
{
    /// <inheritdoc/>
    public IReadOnlyList<string> GetEnvironmentsForOrg(string org)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(org);

        List<string> defaultEnvironments = ["tt02", "prod"];
        return org.ToUpperInvariant() switch
        {
            "TTD" or "DIGDIR" => [.. defaultEnvironments, "yt01", "at22", "at23", "at24"],
            "SKD" => [.. defaultEnvironments, "yt01"],
            _ => defaultEnvironments,
        };
    }
}
