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

    /// <summary>
    /// The address apps send PDF requests to, or null when apps-config has none.
    /// </summary>
    public async Task<Uri?> GetPdfEndpoint(CancellationToken cancellationToken)
    {
        var configMap = await client.CoreV1.ReadNamespacedConfigMapAsync(
            ConfigMapName,
            "default",
            cancellationToken: cancellationToken
        );

        return
            configMap.Data?.TryGetValue(PdfEndpointKey, out var value) == true
            && Uri.TryCreate(value, UriKind.Absolute, out var endpoint)
            ? endpoint
            : null;
    }
}
