#nullable enable

using Altinn.Urn;

namespace Altinn.Authorization.Models;

/// <summary>
/// A unique reference to an access pacakage in the form of an URN.
/// </summary>
[KeyValueUrn]
public abstract partial record AccessPackageUrn
{
    /// <summary>
    /// Try to get the urn as a package id.
    /// </summary>
    /// <param name="packageId">The resulting action.</param>
    /// <returns><see langword="true"/> if this is an action, otherwise <see langword="false"/>.</returns>
    [UrnKey("altinn:accesspackage")]
    public partial bool IsAccessPackageId(out AccessPackageIdentifier packageId);
}
