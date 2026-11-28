using k8s;

namespace Altinn.Studio.Gateway.Api.Clients.K8s;

/// <summary>
/// Reads the configuration that apps get from
/// <see href="https://github.com/Altinn/altinn-studio/tree/main/infra/runtime/apps-config">apps-config</see>.
/// </summary>
internal sealed class AppsConfigClient(IKubernetes client)
{
    public const string ConfigMapName = "apps-runtime-common-config-env";
    private const string PdfEndpointKey = "PdfGeneratorSettings__ServiceEndpointUri";
    private const string StorageEndpointKey = "PlatformSettings__ApiStorageEndpoint";

    /// <summary>
    /// The address apps send PDF requests to, or null when apps-config has none.
    /// </summary>
    public Task<Uri?> GetPdfEndpoint(CancellationToken cancellationToken) =>
        GetEndpoint(PdfEndpointKey, cancellationToken);

    /// <summary>
    /// The address apps call Storage at, or null when apps-config has none.
    /// </summary>
    public Task<Uri?> GetStorageEndpoint(CancellationToken cancellationToken) =>
        GetEndpoint(StorageEndpointKey, cancellationToken);

    private async Task<Uri?> GetEndpoint(string key, CancellationToken cancellationToken)
    {
        var configMap = await client.CoreV1.ReadNamespacedConfigMapAsync(
            ConfigMapName,
            "default",
            cancellationToken: cancellationToken
        );

        return
            configMap.Data?.TryGetValue(key, out var value) == true
            && Uri.TryCreate(value, UriKind.Absolute, out var endpoint)
            ? endpoint
            : null;
    }
}
