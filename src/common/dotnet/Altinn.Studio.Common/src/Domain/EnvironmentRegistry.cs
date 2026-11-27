using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Common.Domain;

/// <summary>
/// Knows the environments that apps run in, and where each serves a service owner's apps, so that no code needs to
/// know Altinn's domain names.
/// </summary>
/// <remarks>
/// This project asks no one. An implementation reads its source, such as the registry on Altinn's CDN. Code that takes
/// a registry does not depend on where the environments and their host names are kept.
/// </remarks>
public abstract class EnvironmentRegistry
{
    /// <summary>Lists every environment the registry has.</summary>
    public abstract Task<IReadOnlyCollection<RuntimeEnvironment>> List(CancellationToken cancellationToken);

    /// <summary>
    /// The host name that serves a service owner's apps in an environment, such as <c>ttd.apps.altinn.no</c>, or
    /// <c>null</c> when the registry does not have the environment.
    /// </summary>
    public abstract Task<string?> AppsHost(
        ServiceOwnerCode org,
        RuntimeEnvironment environment,
        CancellationToken cancellationToken
    );
}
