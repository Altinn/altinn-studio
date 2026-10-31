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

        var running = DeploymentsClient.ToRunningAppDeployment("ttd-my-app", deployment);

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

        var running = DeploymentsClient.ToRunningAppDeployment("ttd-my-app", deployment);

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

        var running = DeploymentsClient.ToRunningAppDeployment("ttd-my-app", deployment);

        Assert.Null(running.RestartedAt);
    }

    [Fact]
    public void StatusOf_WhenEveryPodRunsTheLatestSpecAndIsAvailable_IsReady()
    {
        Assert.Equal(RunningAppStatus.Ready, DeploymentsClient.StatusOf(Deployment()));
    }

    [Fact]
    public void StatusOf_WhenScaledToZero_IsReady()
    {
        var deployment = Deployment(desired: 0, status: new V1DeploymentStatus { ObservedGeneration = 2 });

        Assert.Equal(RunningAppStatus.Ready, DeploymentsClient.StatusOf(deployment));
    }

    [Fact]
    public void StatusOf_WhenTheControllerHasNotSeenTheLatestSpec_IsUpdating()
    {
        var deployment = Deployment();
        deployment.Metadata.Generation = 3;

        Assert.Equal(RunningAppStatus.Updating, DeploymentsClient.StatusOf(deployment));
    }

    [Fact]
    public void StatusOf_WithoutStatus_IsUpdating()
    {
        var deployment = Deployment();
        deployment.Status = null;

        Assert.Equal(RunningAppStatus.Updating, DeploymentsClient.StatusOf(deployment));
    }

    [Theory]
    [InlineData(1, 2, 1)] // Not every desired pod runs the latest spec.
    [InlineData(2, 3, 2)] // An old pod is still terminating.
    [InlineData(2, 2, 1)] // A new pod is not available yet.
    public void StatusOf_WhilePodsAreReplaced_IsUpdating(int updated, int total, int available)
    {
        var deployment = Deployment(
            desired: 2,
            status: new V1DeploymentStatus
            {
                ObservedGeneration = 2,
                UpdatedReplicas = updated,
                Replicas = total,
                AvailableReplicas = available,
            }
        );

        Assert.Equal(RunningAppStatus.Updating, DeploymentsClient.StatusOf(deployment));
    }

    [Fact]
    public void StatusOf_WhenTheRolloutMissedItsDeadline_IsFailed()
    {
        var deployment = Deployment(
            desired: 2,
            status: new V1DeploymentStatus
            {
                ObservedGeneration = 2,
                UpdatedReplicas = 1,
                Replicas = 3,
                AvailableReplicas = 2,
                Conditions =
                [
                    new V1DeploymentCondition { Type = "Available", Status = "True" },
                    new V1DeploymentCondition
                    {
                        Type = "Progressing",
                        Status = "False",
                        Reason = "ProgressDeadlineExceeded",
                    },
                ],
            }
        );

        Assert.Equal(RunningAppStatus.Failed, DeploymentsClient.StatusOf(deployment));
    }

    [Fact]
    public void RestartPatch_StampsThePodTemplateWithTheTime()
    {
        var patch = DeploymentsClient.RestartPatch(new DateTimeOffset(2026, 10, 31, 11, 42, 5, TimeSpan.FromHours(1)));

        Assert.Equal(V1Patch.PatchType.MergePatch, patch.Type);
        Assert.Equal(
            """{"spec":{"template":{"metadata":{"annotations":{"altinn.studio/restarted-at":"2026-10-31T10:42:05Z"}}}}}""",
            patch.Content
        );
    }

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
