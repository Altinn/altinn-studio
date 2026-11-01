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
    private const string RevisionAnnotation = "deployment.kubernetes.io/revision";
    private const int MaxRestartAttempts = 3;

    /// <summary>
    /// How long a pod may stay unready before it counts as failing, such as one waiting for the cluster autoscaler to
    /// add a node. App pods take at least 30 seconds to become ready.
    /// </summary>
    internal static readonly TimeSpan NotReadyGracePeriod = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Why a container waits after it failed more than once, or cannot start until its configuration changes.
    /// </summary>
    private static readonly HashSet<string> FailingReasons =
    [
        "CrashLoopBackOff",
        "ImagePullBackOff",
        "CreateContainerConfigError",
        "InvalidImageName",
    ];

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
        return deployment is null
            ? null
            : ToRunningAppDeployment(release, deployment, await StatusOf(deployment, @namespace, cancellationToken));
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

            var running = ToRunningAppDeployment(
                release,
                deployment,
                await StatusOf(deployment, @namespace, cancellationToken)
            );
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
                // The controller has not seen the stamped template yet, so the app is updating.
                return new AppRestart.Started(ToRunningAppDeployment(release, restarted, RunningAppStatus.Updating));
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
    internal static RunningAppDeployment ToRunningAppDeployment(
        string release,
        V1Deployment deployment,
        RunningAppStatus status
    )
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
            status,
            RestartedAt(annotations)
        );
    }

    private Task<RunningAppStatus> StatusOf(
        V1Deployment deployment,
        string @namespace,
        CancellationToken cancellationToken
    ) => StatusOf(deployment, () => CurrentPods(deployment, @namespace, cancellationToken), _timeProvider.GetUtcNow());

    /// <summary>
    /// Follows the conditions <c>kubectl rollout status</c> waits for to tell whether a rollout runs: the controller has
    /// seen the latest spec, and every desired pod runs it and is available, with no old pods left. Only when a rollout
    /// runs, or a pod is unavailable after one, do the pods tell whether they are on their way or failing, so the pods
    /// of an app that runs as it should are not read.
    /// </summary>
    /// <param name="currentPods">The pods of the Deployment's latest revision, read only when the status depends on them.</param>
    internal static async Task<RunningAppStatus> StatusOf(
        V1Deployment deployment,
        Func<Task<IReadOnlyList<V1Pod>>> currentPods,
        DateTimeOffset now
    )
    {
        var status = deployment.Status;
        if (status is null || (status.ObservedGeneration ?? 0) < (deployment.Metadata?.Generation ?? 0))
        {
            return RunningAppStatus.Updating;
        }

        // Kubernetes omits counts that are zero.
        var desired = deployment.Spec?.Replicas ?? 1;
        var updated = status.UpdatedReplicas ?? 0;
        var total = status.Replicas ?? 0;
        var available = status.AvailableReplicas ?? 0;
        var answers = available > 0 || desired == 0;

        var progress = status.Conditions?.FirstOrDefault(condition => condition.Type == ProgressingCondition)?.Reason;
        if (progress == ProgressDeadlineExceededReason)
        {
            return answers ? RunningAppStatus.Stuck : RunningAppStatus.Unavailable;
        }

        // Pods that stop being available after a rollout completed leave its condition as it was, since nothing is
        // replacing them.
        var replacing =
            updated < desired || total > updated || (available < updated && progress != NewReplicaSetAvailableReason);
        if (replacing)
        {
            if (!await AnyFailing(currentPods, now))
            {
                return RunningAppStatus.Updating;
            }

            return answers ? RunningAppStatus.Stuck : RunningAppStatus.Unavailable;
        }

        if (!answers)
        {
            return RunningAppStatus.Unavailable;
        }

        // Pods that are starting, such as after a scale-up or on a new node, are on their way.
        return available < updated && await AnyFailing(currentPods, now)
            ? RunningAppStatus.Degraded
            : RunningAppStatus.Ready;
    }

    /// <summary>
    /// A pod fails when it is not ready and either a container backs off from failing, or it has not been ready for
    /// longer than a start takes, such as when no node has room for it. Terminating pods are on their way out.
    /// </summary>
    internal static bool IsFailing(V1Pod pod, DateTimeOffset now)
    {
        if (pod.Metadata?.DeletionTimestamp is not null)
        {
            return false;
        }

        var ready = pod.Status?.Conditions?.FirstOrDefault(condition => condition.Type == "Ready");
        if (ready?.Status == "True")
        {
            return false;
        }

        var containers = (pod.Status?.InitContainerStatuses ?? []).Concat(pod.Status?.ContainerStatuses ?? []);
        if (
            containers.Any(container =>
                container.State?.Waiting?.Reason is { } reason && FailingReasons.Contains(reason)
            )
        )
        {
            return true;
        }

        var notReadySince = ready?.LastTransitionTime ?? pod.Metadata?.CreationTimestamp;
        return notReadySince is { } since && now - new DateTimeOffset(since) >= NotReadyGracePeriod;
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

    private static async Task<bool> AnyFailing(Func<Task<IReadOnlyList<V1Pod>>> pods, DateTimeOffset now) =>
        (await pods()).Any(pod => IsFailing(pod, now));

    /// <summary>
    /// The pods of the ReplicaSet that runs the Deployment's latest revision, as <c>kubectl rollout status</c> finds it.
    /// The Deployment's selector only narrows the lists; ownership decides, so pods of an old revision that still
    /// fail do not count against a rollout that replaces them.
    /// </summary>
    private async Task<IReadOnlyList<V1Pod>> CurrentPods(
        V1Deployment deployment,
        string @namespace,
        CancellationToken cancellationToken
    )
    {
        var uid = deployment.Metadata?.Uid;
        var revision = Annotation(deployment.Metadata?.Annotations, RevisionAnnotation);
        var matchLabels = deployment.Spec?.Selector?.MatchLabels;
        if (uid is null || revision is null || matchLabels is null || matchLabels.Count == 0)
        {
            return [];
        }

        var selector = string.Join(',', matchLabels.Select(label => $"{label.Key}={label.Value}"));
        var replicaSets = _kubernetes.AppsV1.ListNamespacedReplicaSetAsync(
            @namespace,
            labelSelector: selector,
            cancellationToken: cancellationToken
        );
        var pods = _kubernetes.CoreV1.ListNamespacedPodAsync(
            @namespace,
            labelSelector: selector,
            cancellationToken: cancellationToken
        );

        await Task.WhenAll(replicaSets, pods);

        var current = (await replicaSets).Items.FirstOrDefault(replicaSet =>
            OwnedBy(replicaSet.Metadata, uid)
            && Annotation(replicaSet.Metadata.Annotations, RevisionAnnotation) == revision
        );
        if (current is null)
        {
            return [];
        }

        return (await pods).Items.Where(pod => OwnedBy(pod.Metadata, current.Metadata.Uid)).ToList();
    }

    private static bool OwnedBy(V1ObjectMeta? metadata, string ownerUid) =>
        metadata?.OwnerReferences?.Any(owner => owner.Uid == ownerUid) == true;

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
