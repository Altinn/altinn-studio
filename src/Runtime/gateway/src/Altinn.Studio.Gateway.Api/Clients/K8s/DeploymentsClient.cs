using System.Globalization;
using System.Net;
using Altinn.Studio.Gateway.Contracts.Deploy;
using k8s;
using k8s.Autorest;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Clients.K8s;

internal sealed class DeploymentsClient(IKubernetes _kubernetes, TimeProvider _timeProvider)
{
    private const string ReleaseLabel = "release";
    private const string ProgressingCondition = "Progressing";
    private const string ProgressDeadlineExceededReason = "ProgressDeadlineExceeded";
    private const string NewReplicaSetAvailableReason = "NewReplicaSetAvailable";
    private const int MaxRestartAttempts = 3;

    // RFC 3339, as kubectl rollout restart writes its annotation.
    internal const string RestartedAtFormat = "yyyy-MM-ddTHH:mm:ssZ";

    /// <summary>
    /// Gets the app's Deployment by its <c>release</c> label rather than by name, since apps deployed before GitOps
    /// carry the same label.
    /// </summary>
    /// <returns>The Deployment, or null when the app has none.</returns>
    public async Task<RunningAppDeployment?> GetRunning(
        string org,
        string app,
        string @namespace,
        CancellationToken cancellationToken
    )
    {
        var release = ReleaseOf(org, app);
        var deployment = await Find(release, @namespace, cancellationToken);
        return deployment is null ? null : ToRunningAppDeployment(release, deployment);
    }

    /// <summary>
    /// Restarts the app by stamping its pod template, as <c>kubectl rollout restart</c> does, so Kubernetes replaces
    /// its pods with the same version, as it would on a deploy. Flux leaves the annotation alone, since app HelmReleases do not
    /// detect drift, and Helm keeps it on the next deploy, since no chart manifest sets it.
    /// </summary>
    public async Task<AppRestart> Restart(
        string org,
        string app,
        string @namespace,
        CancellationToken cancellationToken
    )
    {
        var release = ReleaseOf(org, app);
        var attempt = 0;
        while (true)
        {
            attempt++;
            var deployment = await Find(release, @namespace, cancellationToken);
            if (deployment is null)
            {
                return new AppRestart.NotFound();
            }

            // A paused Deployment accepts the annotation but replaces no pods, so the restart would never finish.
            if (deployment.Spec?.Paused == true)
            {
                return new AppRestart.Paused();
            }

            var running = ToRunningAppDeployment(release, deployment);
            if (running.Status is RunningAppStatus.Updating)
            {
                return new AppRestart.AlreadyUpdating(running);
            }

            try
            {
                var restarted = await _kubernetes.AppsV1.PatchNamespacedDeploymentAsync(
                    RestartPatch(_timeProvider.GetUtcNow(), deployment.Metadata.ResourceVersion),
                    deployment.Metadata.Name,
                    @namespace,
                    cancellationToken: cancellationToken
                );
                return new AppRestart.Started(ToRunningAppDeployment(release, restarted));
            }
            // The Deployment changed since it was read, such as by another restart or a deploy, so decide again.
            catch (HttpOperationException e) when (e.Response.StatusCode == HttpStatusCode.Conflict)
            {
                if (attempt == MaxRestartAttempts)
                {
                    return new AppRestart.AlreadyUpdating(running);
                }
            }
        }
    }

    /// <summary>
    /// The deploy pipeline annotates the pod template rather than the Deployment, because the app chart passes only
    /// pod annotations through. A Helm rollback restores the template, annotations included.
    /// </summary>
    internal static RunningAppDeployment ToRunningAppDeployment(string release, V1Deployment deployment)
    {
        var template = deployment.Spec?.Template;
        var image = template?.Spec?.Containers is [var container, ..] ? container.Image : null;
        var annotations = template?.Metadata?.Annotations;

        return new RunningAppDeployment(
            release,
            ContainerImage.TagOf(image),
            Annotation(annotations, StudioLabels.BuildId),
            Annotation(annotations, StudioLabels.SourceEnvironment),
            Annotation(annotations, StudioLabels.DeploymentId),
            StatusOf(deployment),
            RestartedAt(annotations)
        );
    }

    /// <summary>
    /// Follows the conditions <c>kubectl rollout status</c> waits for: the controller has seen the latest spec, and
    /// every desired pod runs it and is available, with no old pods left. Pods that stop being available after the
    /// rollout completed make the app unavailable rather than updating, since nothing is replacing them.
    /// </summary>
    internal static RunningAppStatus StatusOf(V1Deployment deployment)
    {
        var status = deployment.Status;
        if (status is null || (status.ObservedGeneration ?? 0) < (deployment.Metadata?.Generation ?? 0))
        {
            return RunningAppStatus.Updating;
        }

        var progress = status.Conditions?.FirstOrDefault(condition => condition.Type == ProgressingCondition)?.Reason;
        if (progress == ProgressDeadlineExceededReason)
        {
            return RunningAppStatus.Failed;
        }

        // Kubernetes omits counts that are zero.
        var desired = deployment.Spec?.Replicas ?? 1;
        var updated = status.UpdatedReplicas ?? 0;
        var total = status.Replicas ?? 0;
        var available = status.AvailableReplicas ?? 0;
        if (updated < desired || total > updated)
        {
            return RunningAppStatus.Updating;
        }

        if (available < updated)
        {
            return progress == NewReplicaSetAvailableReason ? RunningAppStatus.Unavailable : RunningAppStatus.Updating;
        }

        return RunningAppStatus.Ready;
    }

    /// <summary>
    /// The patch carries the resource version it was decided on, so Kubernetes rejects it when the Deployment has
    /// changed since.
    /// </summary>
    internal static V1Patch RestartPatch(DateTimeOffset now, string resourceVersion)
    {
        var timestamp = now.UtcDateTime.ToString(RestartedAtFormat, CultureInfo.InvariantCulture);
        return new V1Patch(
            $"{{\"metadata\":{{\"resourceVersion\":\"{resourceVersion}\"}},\"spec\":{{\"template\":{{\"metadata\":{{\"annotations\":{{\"{StudioLabels.RestartedAt}\":\"{timestamp}\"}}}}}}}}}}",
            V1Patch.PatchType.MergePatch
        );
    }

#pragma warning disable CA1308 // Helm release names are lowercase.
    private static string ReleaseOf(string org, string app) => $"{org}-{app}".ToLowerInvariant();
#pragma warning restore CA1308

    private async Task<V1Deployment?> Find(string release, string @namespace, CancellationToken cancellationToken)
    {
        var deployments = await _kubernetes.AppsV1.ListNamespacedDeploymentAsync(
            @namespace,
            labelSelector: $"{ReleaseLabel}={release}",
            cancellationToken: cancellationToken
        );
        return deployments.Items is [var deployment, ..] ? deployment : null;
    }

    private static DateTimeOffset? RestartedAt(IDictionary<string, string>? annotations) =>
        Annotation(annotations, StudioLabels.RestartedAt) is { } value
        && DateTimeOffset.TryParseExact(
            value,
            RestartedAtFormat,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var restartedAt
        )
            ? restartedAt
            : null;

    private static string? Annotation(IDictionary<string, string>? annotations, string key) =>
        annotations is not null && annotations.TryGetValue(key, out var value) && value.Length > 0 ? value : null;
}

/// <summary>
/// The outcome of restarting an app: <see cref="Started"/>, <see cref="NotFound"/>, <see cref="Paused"/> or
/// <see cref="AlreadyUpdating"/>.
/// </summary>
internal abstract record AppRestart
{
    private AppRestart() { }

    /// <param name="Deployment">The app as Kubernetes accepted the restart, so already updating.</param>
    internal sealed record Started(RunningAppDeployment Deployment) : AppRestart;

    internal sealed record NotFound : AppRestart;

    /// <summary>
    /// Someone paused the app's Deployment by hand, so Kubernetes would not replace its pods.
    /// </summary>
    internal sealed record Paused : AppRestart;

    /// <summary>
    /// A deploy or an earlier restart is still replacing the app's instances, or kept changing them while the restart
    /// was decided, so another restart would interrupt instances that have only just started.
    /// </summary>
    internal sealed record AlreadyUpdating(RunningAppDeployment Deployment) : AppRestart;
}
