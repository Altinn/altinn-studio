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
}
