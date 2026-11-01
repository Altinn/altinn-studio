using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Contracts.Deploy;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class DeploymentsClientTests
{
    [Fact]
    public void ToRunningAppDeployment_ReadsTheStudioDeployFromThePodTemplate()
    {
        var deployment = Deployment(
            "registry:5000/ttd/my-app:9cf6fc1",
            new Dictionary<string, string>
            {
                ["altinn.studio/build-id"] = "1234",
                ["altinn.studio/source-environment"] = "prod",
                ["altinn.studio/deployment-id"] = "42",
                ["altinn.studio/restarted-at"] = "2026-10-31T10:42:00Z",
                ["linkerd.io/inject"] = "enabled",
            }
        );

        var running = DeploymentsClient.ToRunningAppDeployment("ttd-my-app", deployment, RunningAppStatus.Ready);

        Assert.Equal(
            new RunningAppDeployment(
                "ttd-my-app",
                "9cf6fc1",
                "1234",
                "prod",
                "42",
                RunningAppStatus.Ready,
                new DateTimeOffset(2026, 10, 31, 10, 42, 0, TimeSpan.Zero)
            ),
            running
        );
    }

    [Fact]
    public void ToRunningAppDeployment_WithoutStudioAnnotations_LeavesThemNull()
    {
        var deployment = Deployment("ttd/my-app:9cf6fc1", annotations: null);

        var running = DeploymentsClient.ToRunningAppDeployment("ttd-my-app", deployment, RunningAppStatus.Ready);

        Assert.Equal(
            new RunningAppDeployment("ttd-my-app", "9cf6fc1", null, null, null, RunningAppStatus.Ready, null),
            running
        );
    }

    [Fact]
    public void ToRunningAppDeployment_WithAnUnreadableRestartTime_LeavesItNull()
    {
        var deployment = Deployment(
            "ttd/my-app:9cf6fc1",
            new Dictionary<string, string> { ["altinn.studio/restarted-at"] = "yesterday" }
        );

        var running = DeploymentsClient.ToRunningAppDeployment("ttd-my-app", deployment, RunningAppStatus.Ready);

        Assert.Null(running.RestartedAt);
    }

    [Fact]
    public async Task StatusOf_WhenEveryPodRunsTheLatestSpecAndIsAvailable_IsReadyWithoutReadingPods()
    {
        Assert.Equal(RunningAppStatus.Ready, await StatusOf(Deployment(), PodsMustNotBeRead));
    }

    [Fact]
    public async Task StatusOf_WhenScaledToZero_IsReady()
    {
        var deployment = Deployment(desired: 0, status: new V1DeploymentStatus { ObservedGeneration = 2 });

        Assert.Equal(RunningAppStatus.Ready, await StatusOf(deployment, PodsMustNotBeRead));
    }

    [Fact]
    public async Task StatusOf_WhenTheControllerHasNotSeenTheLatestSpec_IsUpdating()
    {
        var deployment = Deployment();
        deployment.Metadata.Generation = 3;

        Assert.Equal(RunningAppStatus.Updating, await StatusOf(deployment, PodsMustNotBeRead));
    }

    [Fact]
    public async Task StatusOf_WithoutStatus_IsUpdating()
    {
        var deployment = Deployment();
        deployment.Status = null;

        Assert.Equal(RunningAppStatus.Updating, await StatusOf(deployment, PodsMustNotBeRead));
    }

    [Theory]
    [InlineData(1, 2, 1)] // Not every desired pod runs the latest spec.
    [InlineData(2, 3, 2)] // An old pod is still terminating.
    [InlineData(2, 2, 1)] // A new pod is not available yet.
    public async Task StatusOf_WhilePodsAreReplaced_IsUpdating(int updated, int total, int available)
    {
        var deployment = Deployment(desired: 2, status: Status(updated, total, available, "ReplicaSetUpdated"));

        Assert.Equal(RunningAppStatus.Updating, await StatusOf(deployment, [ReadyPod(), StartingPod()]));
    }

    [Fact]
    public async Task StatusOf_WhenTheAppIsInstalledAndItsFirstPodsStart_IsUpdating()
    {
        var deployment = Deployment(desired: 2, status: Status(2, 2, 0, "ReplicaSetUpdated"));

        Assert.Equal(RunningAppStatus.Updating, await StatusOf(deployment, [StartingPod(), StartingPod()]));
    }

    [Theory]
    [InlineData("CrashLoopBackOff")]
    [InlineData("ImagePullBackOff")]
    [InlineData("CreateContainerConfigError")]
    [InlineData("InvalidImageName")]
    public async Task StatusOf_WhenANewPodFailsWhileTheOldOnesServe_IsStuck(string reason)
    {
        var deployment = Deployment(desired: 2, status: Status(1, 3, 2, "ReplicaSetUpdated"));

        Assert.Equal(RunningAppStatus.Stuck, await StatusOf(deployment, [WaitingPod(reason)]));
    }

    [Fact]
    public async Task StatusOf_WhenANewPodHasNotBecomeReadyForLongerThanAStartTakes_IsStuck()
    {
        var deployment = Deployment(desired: 2, status: Status(1, 3, 2, "ReplicaSetUpdated"));

        Assert.Equal(
            RunningAppStatus.Stuck,
            await StatusOf(deployment, [StartingPod(since: Now - DeploymentsClient.NotReadyGracePeriod)])
        );
    }

    [Fact]
    public async Task StatusOf_WhenANewPodIsStillWithinTheTimeAStartTakes_IsUpdating()
    {
        var deployment = Deployment(desired: 2, status: Status(1, 3, 2, "ReplicaSetUpdated"));
        var pod = StartingPod(since: Now - DeploymentsClient.NotReadyGracePeriod + TimeSpan.FromSeconds(1));

        Assert.Equal(RunningAppStatus.Updating, await StatusOf(deployment, [pod]));
    }

    [Fact]
    public async Task StatusOf_WhenTheFirstPodsFail_IsUnavailable()
    {
        var deployment = Deployment(desired: 2, status: Status(2, 2, 0, "ReplicaSetUpdated"));

        Assert.Equal(
            RunningAppStatus.Unavailable,
            await StatusOf(deployment, [WaitingPod("CrashLoopBackOff"), StartingPod()])
        );
    }

    [Fact]
    public async Task StatusOf_WhenTheRolloutMissedItsDeadlineWhileTheOldPodsServe_IsStuck()
    {
        var deployment = Deployment(desired: 2, status: Status(1, 3, 2, "ProgressDeadlineExceeded"));

        Assert.Equal(RunningAppStatus.Stuck, await StatusOf(deployment, PodsMustNotBeRead));
    }

    [Fact]
    public async Task StatusOf_WhenTheRolloutMissedItsDeadlineWithNothingServing_IsUnavailable()
    {
        var deployment = Deployment(desired: 2, status: Status(2, 2, 0, "ProgressDeadlineExceeded"));

        Assert.Equal(RunningAppStatus.Unavailable, await StatusOf(deployment, PodsMustNotBeRead));
    }

    [Fact]
    public async Task StatusOf_WhenAPodStartsAfterTheRollout_IsReady()
    {
        // Such as after a scale-up, or when a pod moves to another node.
        var deployment = Deployment(desired: 3, status: Status(3, 3, 2, "NewReplicaSetAvailable"));

        Assert.Equal(RunningAppStatus.Ready, await StatusOf(deployment, [ReadyPod(), ReadyPod(), StartingPod()]));
    }

    [Theory]
    [InlineData("CrashLoopBackOff")]
    [InlineData("ImagePullBackOff")]
    public async Task StatusOf_WhenAPodFailsAfterTheRollout_IsDegraded(string reason)
    {
        var deployment = Deployment(desired: 2, status: Status(2, 2, 1, "NewReplicaSetAvailable"));

        Assert.Equal(RunningAppStatus.Degraded, await StatusOf(deployment, [ReadyPod(), WaitingPod(reason)]));
    }

    [Fact]
    public async Task StatusOf_WhenAPodFindsNoRoomForLongerThanAStartTakes_IsDegraded()
    {
        var deployment = Deployment(desired: 3, status: Status(3, 3, 2, "NewReplicaSetAvailable"));
        var pending = new V1Pod
        {
            Metadata = new V1ObjectMeta
            {
                CreationTimestamp = (Now - DeploymentsClient.NotReadyGracePeriod).UtcDateTime,
            },
            Status = new V1PodStatus
            {
                Phase = "Pending",
                Conditions =
                [
                    new V1PodCondition
                    {
                        Type = "PodScheduled",
                        Status = "False",
                        Reason = "Unschedulable",
                    },
                ],
            },
        };

        Assert.Equal(RunningAppStatus.Degraded, await StatusOf(deployment, [ReadyPod(), ReadyPod(), pending]));
    }

    [Fact]
    public async Task StatusOf_WhenNoPodIsAvailableAfterTheRollout_IsUnavailable()
    {
        var deployment = Deployment(desired: 2, status: Status(2, 2, 0, "NewReplicaSetAvailable"));

        Assert.Equal(RunningAppStatus.Unavailable, await StatusOf(deployment, PodsMustNotBeRead));
    }

    [Fact]
    public void IsFailing_WhenThePodIsTerminating_IsFalse()
    {
        var pod = WaitingPod("CrashLoopBackOff");
        pod.Metadata.DeletionTimestamp = Now.UtcDateTime;

        Assert.False(DeploymentsClient.IsFailing(pod, Now));
    }

    [Fact]
    public void IsFailing_WhenAnInitContainerBacksOff_IsTrue()
    {
        var pod = StartingPod();
        pod.Status.InitContainerStatuses =
        [
            new V1ContainerStatus
            {
                Name = "init",
                State = new V1ContainerState { Waiting = new V1ContainerStateWaiting { Reason = "CrashLoopBackOff" } },
            },
        ];

        Assert.True(DeploymentsClient.IsFailing(pod, Now));
    }

    [Fact]
    public void IsFailing_WhenThePodIsReady_IsFalse()
    {
        Assert.False(DeploymentsClient.IsFailing(ReadyPod(), Now));
    }

    [Fact]
    public void RestartPatch_StampsThePodTemplateOfTheVersionItWasDecidedOn()
    {
        var patch = DeploymentsClient.RestartPatch(
            new DateTimeOffset(2026, 10, 31, 11, 42, 5, TimeSpan.FromHours(1)),
            resourceVersion: "4711"
        );

        Assert.Equal(V1Patch.PatchType.MergePatch, patch.Type);
        Assert.Equal(
            """{"metadata":{"resourceVersion":"4711"},"spec":{"template":{"metadata":{"annotations":{"altinn.studio/restarted-at":"2026-10-31T10:42:05Z"}}}}}""",
            patch.Content
        );
    }

    private static readonly DateTimeOffset Now = new(2026, 11, 1, 12, 0, 0, TimeSpan.Zero);

    private static readonly Func<Task<IReadOnlyList<V1Pod>>> PodsMustNotBeRead = () =>
        throw new InvalidOperationException("The Deployment alone decides this status.");

    private static Task<RunningAppStatus> StatusOf(V1Deployment deployment, IReadOnlyList<V1Pod> pods) =>
        DeploymentsClient.StatusOf(deployment, () => Task.FromResult(pods), Now);

    private static Task<RunningAppStatus> StatusOf(V1Deployment deployment, Func<Task<IReadOnlyList<V1Pod>>> pods) =>
        DeploymentsClient.StatusOf(deployment, pods, Now);

    private static V1DeploymentStatus Status(int updated, int total, int available, string progress) =>
        new()
        {
            ObservedGeneration = 2,
            UpdatedReplicas = updated,
            Replicas = total,
            AvailableReplicas = available,
            Conditions =
            [
                new V1DeploymentCondition
                {
                    Type = "Progressing",
                    Status = progress == "ProgressDeadlineExceeded" ? "False" : "True",
                    Reason = progress,
                },
            ],
        };

    private static V1Pod ReadyPod() => Pod(ready: true, since: Now - TimeSpan.FromHours(1));

    /// <summary>A pod whose containers run, but which is not ready yet.</summary>
    private static V1Pod StartingPod(DateTimeOffset? since = null) =>
        Pod(ready: false, since: since ?? Now - TimeSpan.FromSeconds(20));

    private static V1Pod WaitingPod(string reason)
    {
        var pod = Pod(ready: false, since: Now - TimeSpan.FromSeconds(20));
        pod.Status.ContainerStatuses =
        [
            new V1ContainerStatus
            {
                Name = "my-app",
                State = new V1ContainerState { Waiting = new V1ContainerStateWaiting { Reason = reason } },
            },
        ];
        return pod;
    }

    private static V1Pod Pod(bool ready, DateTimeOffset since) =>
        new()
        {
            Metadata = new V1ObjectMeta { CreationTimestamp = since.UtcDateTime },
            Status = new V1PodStatus
            {
                Phase = "Running",
                Conditions =
                [
                    new V1PodCondition
                    {
                        Type = "Ready",
                        Status = ready ? "True" : "False",
                        LastTransitionTime = since.UtcDateTime,
                    },
                ],
            },
        };

    private static V1Deployment Deployment(
        string image = "ttd/my-app:9cf6fc1",
        IDictionary<string, string>? annotations = null,
        int desired = 2,
        V1DeploymentStatus? status = null
    ) =>
        new()
        {
            Metadata = new V1ObjectMeta { Generation = 2 },
            Spec = new V1DeploymentSpec
            {
                Replicas = desired,
                Template = new V1PodTemplateSpec
                {
                    Metadata = new V1ObjectMeta { Annotations = annotations },
                    Spec = new V1PodSpec { Containers = [new V1Container { Name = "my-app", Image = image }] },
                },
            },
            Status =
                status
                ?? new V1DeploymentStatus
                {
                    ObservedGeneration = 2,
                    UpdatedReplicas = desired,
                    Replicas = desired,
                    AvailableReplicas = desired,
                },
        };
}
