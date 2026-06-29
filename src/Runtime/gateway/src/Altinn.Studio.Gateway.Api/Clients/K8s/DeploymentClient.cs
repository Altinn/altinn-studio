using k8s;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Clients.K8s;

internal sealed class DeploymentClient(IKubernetes _kubernetes)
{
    private const string Namespace = "default";
    private const string ReleaseLabel = "release";

    public async Task<RuntimeDeployment?> GetAppDeployment(string org, string app, CancellationToken cancellationToken)
    {
        try
        {
            var deployment = await _kubernetes.AppsV1.ReadNamespacedDeploymentAsync(
                CreateDeploymentName(org, app),
                Namespace,
                cancellationToken: cancellationToken
            );

            var runtimeDeployment = TryMapDeployment(org, deployment);
            return runtimeDeployment?.App == app ? runtimeDeployment : null;
        }
        catch (k8s.Autorest.HttpOperationException ex)
            when (ex.Response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<IReadOnlyList<RuntimeDeployment>> ListAppDeployments(
        string org,
        CancellationToken cancellationToken
    )
    {
        var deploymentList = await _kubernetes.AppsV1.ListNamespacedDeploymentAsync(
            Namespace,
            cancellationToken: cancellationToken
        );

        return deploymentList
            .Items.Select(deployment => TryMapDeployment(org, deployment))
            .OfType<RuntimeDeployment>()
            .ToList();
    }

    private static RuntimeDeployment? TryMapDeployment(string org, V1Deployment deployment)
    {
        var app = TryGetAppName(org, deployment);
        if (app is null)
        {
            return null;
        }

        return MapDeployment(app, deployment);
    }

    private static RuntimeDeployment MapDeployment(string app, V1Deployment deployment)
    {
        var updateInProgress = IsUpdateInProgress(deployment);
        var imageTag = GetVersion(deployment);

        return new RuntimeDeployment(app, imageTag, updateInProgress ? null : imageTag, updateInProgress);
    }

    private static string CreateDeploymentName(string org, string app) => $"{org}-{app}-deployment-v2";

    private static string? GetRelease(V1Deployment deployment)
    {
        var labels = deployment.Metadata.Labels;
        return labels is not null && labels.TryGetValue(ReleaseLabel, out var release) ? release : null;
    }

    private static string? TryGetAppName(string org, V1Deployment deployment)
    {
        var release = GetRelease(deployment);
        var app = TryParseAppName(org, release);
        if (app is null)
        {
            return null;
        }

        return deployment.Metadata.Name == CreateDeploymentName(org, app) ? app : null;
    }

    private static string? GetVersion(V1Deployment deployment)
    {
        var image = deployment.Spec.Template.Spec?.Containers.FirstOrDefault()?.Image;
        if (image is null)
        {
            return null;
        }

        var lastColonIndex = image.LastIndexOf(':');
        return lastColonIndex >= 0 && lastColonIndex < image.Length - 1 ? image[(lastColonIndex + 1)..] : null;
    }

    private static string? TryParseAppName(string org, string? release)
    {
        if (release is null || !release.StartsWith($"{org}-", StringComparison.Ordinal))
        {
            return null;
        }

        return release[(org.Length + 1)..];
    }

    private static bool IsUpdateInProgress(V1Deployment deployment)
    {
        var desiredReplicas = deployment.Spec.Replicas ?? 0;
        var status = deployment.Status;

        return status.ObservedGeneration < deployment.Metadata.Generation
            || (status.Replicas ?? 0) != (status.UpdatedReplicas ?? 0)
            || (status.UpdatedReplicas ?? 0) < desiredReplicas
            || (status.ReadyReplicas ?? 0) < desiredReplicas
            || (status.AvailableReplicas ?? 0) < desiredReplicas
            || (status.UnavailableReplicas ?? 0) > 0;
    }

    internal sealed record RuntimeDeployment(
        string App,
        string? ImageTag,
        string? CurrentVersion,
        bool UpdateInProgress
    );
}
