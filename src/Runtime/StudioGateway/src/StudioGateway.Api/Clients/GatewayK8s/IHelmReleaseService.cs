namespace StudioGateway.Api.Clients.GatewayK8s;

/// <summary>
/// Service for interacting with HelmRelease resources in Kubernetes
/// </summary>
internal interface IHelmReleaseService
{
    /// <summary>
    /// Gets the labels from a HelmRelease
    /// </summary>
    /// <param name="name">Name of the HelmRelease</param>
    /// <param name="namespace">Namespace of the HelmRelease</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Dictionary of labels, or null if not found</returns>
    Task<Dictionary<string, string>?> GetLabelsAsync(
        string name,
        string @namespace,
        CancellationToken cancellationToken = default
    );
}
