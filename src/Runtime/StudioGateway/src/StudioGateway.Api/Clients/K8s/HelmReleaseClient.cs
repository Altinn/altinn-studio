using k8s;

namespace StudioGateway.Api.Clients.K8s;

/// <summary>
/// Service for interacting with HelmRelease resources in Kubernetes
/// </summary>
internal sealed class HelmReleaseClient(IKubernetes kubernetes)
{
    private const string HelmReleaseGroup = "helm.toolkit.fluxcd.io";
    private const string HelmReleaseVersion = "v2";
    private const string HelmReleasePlural = "helmreleases";

    /// <summary>
    /// Checks if a HelmRelease exists
    /// </summary>
    /// <param name="name">Name of the HelmRelease</param>
    /// <param name="namespace">Namespace of the HelmRelease</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if the HelmRelease exists, false otherwise</returns>
    public async Task<bool> ExistsAsync(string name, string @namespace, CancellationToken cancellationToken = default)
    {
        try
        {
            await kubernetes.CustomObjects.GetNamespacedCustomObjectAsync(
                HelmReleaseGroup,
                HelmReleaseVersion,
                @namespace,
                HelmReleasePlural,
                name,
                cancellationToken
            );
            return true;
        }
        catch (k8s.Autorest.HttpOperationException ex)
            when (ex.Response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    /// <summary>
    /// Gets the labels from a HelmRelease.
    /// Use <see cref="ExistsAsync"/> first to check if the HelmRelease exists.
    /// </summary>
    /// <param name="name">Name of the HelmRelease</param>
    /// <param name="namespace">Namespace of the HelmRelease</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Dictionary of labels (empty if none)</returns>
    public async Task<Dictionary<string, string>> GetLabelsAsync(
        string name,
        string @namespace,
        CancellationToken cancellationToken = default
    )
    {
        var helmRelease = await kubernetes.CustomObjects.GetNamespacedCustomObjectAsync(
            HelmReleaseGroup,
            HelmReleaseVersion,
            @namespace,
            HelmReleasePlural,
            name,
            cancellationToken
        );

        if (
            helmRelease is not System.Text.Json.JsonElement element
            || !element.TryGetProperty("metadata", out var metadata)
            || !metadata.TryGetProperty("labels", out var labels)
        )
            return [];

        var result = new Dictionary<string, string>();
        foreach (var property in labels.EnumerateObject())
        {
            var value = property.Value.GetString();
            if (value is not null)
                result[property.Name] = value;
        }

        return result;
    }
}
