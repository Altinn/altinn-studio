using System.Globalization;
using k8s;
using k8s.Models;

namespace StudioGateway.Api.Clients.K8s;

internal sealed class OciRepositoryClient(IKubernetes kubernetes, TimeProvider timeProvider)
{
    private const string Group = "source.toolkit.fluxcd.io";
    private const string Version = "v1";
    private const string Plural = "ocirepositories";

    // Flux expects RFC3339 with sub-second precision (7 digits is fine, nano would be 9)
    internal const string TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffffffZ";

    public async Task TriggerReconcileAsync(
        string name,
        string @namespace,
        CancellationToken cancellationToken = default
    )
    {
        var timestamp = timeProvider.GetUtcNow().UtcDateTime.ToString(TimestampFormat, CultureInfo.InvariantCulture);
        var patch = new V1Patch(
            $"{{\"metadata\":{{\"annotations\":{{\"reconcile.fluxcd.io/requestedAt\":\"{timestamp}\"}}}}}}",
            V1Patch.PatchType.MergePatch
        );

        await kubernetes.CustomObjects.PatchNamespacedCustomObjectAsync(
            patch,
            Group,
            Version,
            @namespace,
            Plural,
            name,
            cancellationToken: cancellationToken
        );
    }
}
