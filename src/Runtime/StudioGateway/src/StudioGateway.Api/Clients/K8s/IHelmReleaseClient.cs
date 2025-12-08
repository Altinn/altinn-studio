namespace StudioGateway.Api.Clients.K8s;

/// <summary>
/// Service for interacting with HelmRelease resources in Kubernetes
/// </summary>
internal interface IHelmReleaseService
{
    /// <summary>
    /// Checks if a HelmRelease exists
    /// </summary>
    /// <param name="name">Name of the HelmRelease</param>
    /// <param name="namespace">Namespace of the HelmRelease</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if the HelmRelease exists, false otherwise</returns>
    Task<bool> ExistsAsync(string name, string @namespace, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the labels from a HelmRelease.
    /// Use <see cref="ExistsAsync"/> first to check if the HelmRelease exists.
    /// </summary>
    /// <param name="name">Name of the HelmRelease</param>
    /// <param name="namespace">Namespace of the HelmRelease</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Dictionary of labels (empty if none)</returns>
    Task<Dictionary<string, string>> GetLabelsAsync(
        string name,
        string @namespace,
        CancellationToken cancellationToken = default
    );
}
