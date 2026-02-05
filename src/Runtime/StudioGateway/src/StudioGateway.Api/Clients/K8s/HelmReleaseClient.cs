using System.Net;
using System.Text.Json;
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
    /// Gets a single HelmRelease
    /// </summary>
    /// <param name="name">Name of the HelmRelease</param>
    /// <param name="namespace">Namespace of the HelmRelease</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>HelmRelease if exists, or null if not found</returns>
    public async Task<HelmRelease?> GetAsync(
        string name,
        string @namespace,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var obj = await kubernetes.CustomObjects.GetNamespacedCustomObjectAsync(
                HelmReleaseGroup,
                HelmReleaseVersion,
                @namespace,
                HelmReleasePlural,
                name,
                cancellationToken
            );

            if (obj is not JsonElement element)
            {
                throw new InvalidOperationException(
                    $"Expected JsonElement when retrieving HelmRelease '{name}' in namespace '{@namespace}', but got '{obj?.GetType().FullName ?? "null"}'."
                );
            }

            return new HelmRelease(element);
        }
        catch (k8s.Autorest.HttpOperationException ex) when (ex.Response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    /// <summary>
    /// Lists HelmReleases in a namespace.
    /// </summary>
    /// <param name="namespace">Namespace of the HelmReleases</param>
    /// <param name="fieldSelector">Optional Kubernetes field selector</param>
    /// <param name="labelSelector">Optional Kubernetes label selector</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>
    /// A list of HelmReleases. The list is empty if no HelmReleases match.
    /// </returns>
    public async Task<IReadOnlyList<HelmRelease>> ListAsync(
        string @namespace,
        string? fieldSelector = null,
        string? labelSelector = null,
        CancellationToken cancellationToken = default
    )
    {
        var obj = await kubernetes.CustomObjects.ListNamespacedCustomObjectAsync(
            HelmReleaseGroup,
            HelmReleaseVersion,
            @namespace,
            HelmReleasePlural,
            fieldSelector: fieldSelector,
            labelSelector: labelSelector,
            cancellationToken: cancellationToken
        );

        if (obj is not JsonElement element)
        {
            throw new InvalidOperationException(
                $"Expected JsonElement when retrieving HelmReleases namespace '{@namespace}', but got '{obj?.GetType().FullName ?? "null"}'."
            );
        }

        if (!element.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException(
                $"Expected HelmRelease list response to contain an 'items' array in namespace '{@namespace}'."
            );
        }

        return items.EnumerateArray().Select(item => new HelmRelease(item)).ToList();
    }
}
