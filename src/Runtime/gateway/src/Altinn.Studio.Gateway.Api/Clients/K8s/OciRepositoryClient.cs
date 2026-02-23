using k8s;

namespace Altinn.Studio.Gateway.Api.Clients.K8s;

internal sealed class OciRepositoryClient(IKubernetes _kubernetes, TimeProvider _timeProvider)
{
    private const string Group = "source.toolkit.fluxcd.io";
    private const string Version = "v1";
    private const string Plural = "ocirepositories";

    public async Task TriggerReconcile(string name, string @namespace, CancellationToken cancellationToken = default)
    {
        var patch = FluxReconcileHelper.CreateReconcilePatch(_timeProvider);

        await _kubernetes.CustomObjects.PatchNamespacedCustomObjectAsync(
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
