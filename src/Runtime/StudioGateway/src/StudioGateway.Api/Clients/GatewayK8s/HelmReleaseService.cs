using k8s;

namespace StudioGateway.Api.Clients.GatewayK8s;

/// <summary>
/// Service for interacting with HelmRelease resources in Kubernetes
/// </summary>
internal sealed class HelmReleaseService(IKubernetes kubernetes) : IHelmReleaseService
{
    private const string HelmReleaseGroup = "helm.toolkit.fluxcd.io";
    private const string HelmReleaseVersion = "v2";
    private const string HelmReleasePlural = "helmreleases";

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
