using Altinn.Studio.Gateway.Api.Clients.K8s;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class DeploymentClientTests
{
    [Fact]
    public void IsUpdateInProgress_WhenDeploymentRolloutStatusIsComplete_ReturnsFalse()
    {
        var deployment = CreateDeployment(
            generation: 2,
            desiredReplicas: 3,
            status: new V1DeploymentStatus
            {
                ObservedGeneration = 2,
                Replicas = 3,
                UpdatedReplicas = 3,
                ReadyReplicas = 3,
                AvailableReplicas = 3,
                UnavailableReplicas = 0,
            }
        );

        var updateInProgress = DeploymentClient.IsUpdateInProgress(deployment);

        Assert.False(updateInProgress);
    }

    // Kubernetes considers a Deployment rollout complete when all desired replicas are updated,
    // available, and no old replicas are running:
    // https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#complete-deployment
    [Theory]
    [InlineData(2, 1, 3, 3, 3, 3, 3, 0)]
    [InlineData(2, 2, 3, 4, 3, 3, 3, 0)]
    [InlineData(2, 2, 3, 3, 2, 2, 2, 1)]
    [InlineData(2, 2, 3, 3, 3, 2, 2, 1)]
    [InlineData(2, 2, 3, 3, 3, 3, 2, 1)]
    [InlineData(2, 2, 3, 3, 3, 3, 3, 1)]
    public void IsUpdateInProgress_WhenDeploymentRolloutStatusIsIncomplete_ReturnsTrue(
        long generation,
        long observedGeneration,
        int desiredReplicas,
        int replicas,
        int updatedReplicas,
        int readyReplicas,
        int availableReplicas,
        int unavailableReplicas
    )
    {
        var deployment = CreateDeployment(
            generation,
            desiredReplicas,
            new V1DeploymentStatus
            {
                ObservedGeneration = observedGeneration,
                Replicas = replicas,
                UpdatedReplicas = updatedReplicas,
                ReadyReplicas = readyReplicas,
                AvailableReplicas = availableReplicas,
                UnavailableReplicas = unavailableReplicas,
            }
        );

        var updateInProgress = DeploymentClient.IsUpdateInProgress(deployment);

        Assert.True(updateInProgress);
    }

    [Fact]
    public void IsUpdateInProgress_WhenDeploymentStatusIsMissingAndReplicasAreDesired_ReturnsTrue()
    {
        var deployment = CreateDeployment(generation: 1, desiredReplicas: 1, status: null);

        var updateInProgress = DeploymentClient.IsUpdateInProgress(deployment);

        Assert.True(updateInProgress);
    }

    private static V1Deployment CreateDeployment(long generation, int desiredReplicas, V1DeploymentStatus? status) =>
        new()
        {
            Metadata = new V1ObjectMeta
            {
                Generation = generation,
                Name = "ttd-test-app-deployment-v2",
                Labels = new Dictionary<string, string> { ["release"] = "ttd-test-app" },
            },
            Spec = new V1DeploymentSpec
            {
                Replicas = desiredReplicas,
                Template = new V1PodTemplateSpec
                {
                    Spec = new V1PodSpec { Containers = [new V1Container { Image = "repo/test-app:1.2.3" }] },
                },
            },
            Status = status,
        };
}
