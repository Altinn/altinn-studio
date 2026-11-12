using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Common.App;

/// <summary>
/// Knows which service owners there are. It is the only source of a <see cref="ServiceOwner"/>, so code that holds
/// one knows that a registry had it.
/// </summary>
/// <remarks>
/// This project asks no one. An implementation reads its source, such as the registry on Altinn's CDN or a database,
/// and creates service owners with <see cref="Registered"/>. Code that takes a registry does not depend on where a
/// service owner's code and its environments are kept.
/// </remarks>
public abstract class ServiceOwnerRegistry
{
    /// <summary>Finds the service owner with the code, or <c>null</c> when the registry has none.</summary>
    public abstract Task<ServiceOwner?> Find(ServiceOwnerCode code, CancellationToken cancellationToken);

    /// <summary>Lists every service owner the registry has.</summary>
    public abstract Task<IReadOnlyCollection<ServiceOwner>> List(CancellationToken cancellationToken);

    /// <summary>Creates a service owner that this registry has.</summary>
    /// <param name="code">The service owner code.</param>
    /// <param name="environments">The environments that have a cluster for the code.</param>
    protected static ServiceOwner Registered(ServiceOwnerCode code, IEnumerable<RuntimeEnvironment> environments) =>
        new(code, environments);
}
