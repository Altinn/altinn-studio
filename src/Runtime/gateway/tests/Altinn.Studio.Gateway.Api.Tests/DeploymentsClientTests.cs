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
                ["linkerd.io/inject"] = "enabled",
            }
        );

        var running = DeploymentsClient.ToRunningAppDeployment("ttd-my-app", deployment);

        Assert.Equal(new RunningAppDeployment("ttd-my-app", "9cf6fc1", "1234", "prod", "42"), running);
    }

    [Fact]
    public void ToRunningAppDeployment_WithoutStudioAnnotations_LeavesThemNull()
    {
        var deployment = Deployment("ttd/my-app:9cf6fc1", annotations: null);

        var running = DeploymentsClient.ToRunningAppDeployment("ttd-my-app", deployment);

        Assert.Equal(new RunningAppDeployment("ttd-my-app", "9cf6fc1", null, null, null), running);
    }

    private static V1Deployment Deployment(string image, IDictionary<string, string>? annotations) =>
        new()
        {
            Spec = new V1DeploymentSpec
            {
                Template = new V1PodTemplateSpec
                {
                    Metadata = new V1ObjectMeta { Annotations = annotations },
                    Spec = new V1PodSpec { Containers = [new V1Container { Name = "my-app", Image = image }] },
                },
            },
        };
}
