using k8s;

namespace StudioGateway.Api.GatewayK8s;

/// <summary>
/// Service for interacting with HelmRelease resources in Kubernetes
/// </summary>
internal sealed class HelmReleaseService(IKubernetes kubernetes) : IHelmReleaseService
{
    private const string HelmReleaseGroup = "helm.toolkit.fluxcd.io";
    private const string HelmReleaseVersion = "v2";
    private const string HelmReleasePlural = "helmreleases";

    public async Task<Dictionary<string, string>?> GetLabelsAsync(
        string name,
        string @namespace,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var helmRelease = await kubernetes.CustomObjects.GetNamespacedCustomObjectAsync(
                HelmReleaseGroup,
                HelmReleaseVersion,
                @namespace,
                HelmReleasePlural,
                name,
                cancellationToken
            );

            if (helmRelease is not System.Text.Json.JsonElement element)
                return null;

            if (!element.TryGetProperty("metadata", out var metadata))
                return null;

            if (!metadata.TryGetProperty("labels", out var labels))
                return null;

            var result = new Dictionary<string, string>();
            foreach (var property in labels.EnumerateObject())
            {
                var value = property.Value.GetString();
                if (value is not null)
                    result[property.Name] = value;
            }

            return result;
        }
        catch (k8s.Autorest.HttpOperationException ex)
            when (ex.Response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }
}
