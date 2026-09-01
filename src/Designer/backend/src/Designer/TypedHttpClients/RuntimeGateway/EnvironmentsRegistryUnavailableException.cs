using System;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

/// <summary>
/// Thrown when the environments registry (the cached environments.json used to resolve an app
/// cluster address) could not be read, so no runtime gateway call was ever attempted. Kept
/// distinct from the failures of the gateway call itself: a registry outage is a Designer-side
/// dependency failure and must not be reported as an unreachable runtime gateway.
/// </summary>
public class EnvironmentsRegistryUnavailableException : Exception
{
    public EnvironmentsRegistryUnavailableException() { }

    public EnvironmentsRegistryUnavailableException(string message)
        : base(message) { }

    public EnvironmentsRegistryUnavailableException(string message, Exception innerException)
        : base(message, innerException) { }
}
