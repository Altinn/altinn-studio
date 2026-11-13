using System.Collections.Generic;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Resolves which Altinn environments an organization's resource registry resources apply to.
/// </summary>
public interface IResourceEnvironmentsService
{
    /// <summary>
    /// Gets the environments the given organization can publish resources to, and that resources are
    /// read from. The environments are returned in the order they should be presented to the user.
    /// </summary>
    /// <param name="org">The short name of the organization</param>
    /// <returns>The environment names, for example tt02 and prod</returns>
    IReadOnlyList<string> GetEnvironmentsForOrg(string org);
}
