using System.Globalization;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Clients.K8s;

internal static class FluxReconcileHelper
{
    private const string ReconcileAnnotation = "reconcile.fluxcd.io/requestedAt";

    // Flux expects RFC3339 with sub-second precision
    internal const string TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffffffZ";

    public static V1Patch CreateReconcilePatch(TimeProvider timeProvider)
    {
        var timestamp = timeProvider.GetUtcNow().UtcDateTime.ToString(TimestampFormat, CultureInfo.InvariantCulture);
        return new V1Patch(
            $"{{\"metadata\":{{\"annotations\":{{\"{ReconcileAnnotation}\":\"{timestamp}\"}}}}}}",
            V1Patch.PatchType.MergePatch
        );
    }
}
