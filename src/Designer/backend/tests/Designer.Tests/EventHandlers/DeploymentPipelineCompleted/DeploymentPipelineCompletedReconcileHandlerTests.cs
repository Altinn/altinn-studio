using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.EventHandlers.DeploymentPipelineCompleted;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using PipelineType = Altinn.Studio.Designer.Events.PipelineType;

namespace Designer.Tests.EventHandlers.DeploymentPipelineCompleted;

public class DeploymentPipelineCompletedReconcileHandlerTests
{
    [Theory]
    [InlineData(PipelineType.Deploy, false)]
    [InlineData(PipelineType.Undeploy, true)]
    public async Task Handle_WhenPipelineSucceeded_ShouldTriggerReconcile(
        PipelineType pipelineType,
        bool expectedIsUndeploy
    )
    {
        // Arrange
        var runtimeGatewayClient = new Mock<IRuntimeGatewayClient>();
        var handler = new DeploymentPipelineCompletedReconcileHandler(
            runtimeGatewayClient.Object,
            Mock.Of<ILogger<DeploymentPipelineCompletedReconcileHandler>>()
        );
        var notification = CreateNotification(pipelineType, succeeded: true);

        // Act
        await handler.Handle(notification, CancellationToken.None);

        // Assert
        runtimeGatewayClient.Verify(
            client =>
                client.TriggerReconcileAsync(
                    "ttd",
                    "test-app",
                    It.Is<AltinnEnvironment>(environment => environment.Name == "at22"),
                    expectedIsUndeploy,
                    CancellationToken.None
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Handle_WhenPipelineFailed_ShouldNotTriggerReconcile()
    {
        // Arrange
        var runtimeGatewayClient = new Mock<IRuntimeGatewayClient>();
        var handler = new DeploymentPipelineCompletedReconcileHandler(
            runtimeGatewayClient.Object,
            Mock.Of<ILogger<DeploymentPipelineCompletedReconcileHandler>>()
        );
        var notification = CreateNotification(PipelineType.Deploy, succeeded: false);

        // Act
        await handler.Handle(notification, CancellationToken.None);

        // Assert
        runtimeGatewayClient.Verify(
            client =>
                client.TriggerReconcileAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<bool>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    private static Altinn.Studio.Designer.Events.DeploymentPipelineCompleted CreateNotification(
        PipelineType pipelineType,
        bool succeeded
    ) =>
        new()
        {
            EditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "test-app", "developer"),
            Environment = "at22",
            PipelineType = pipelineType,
            Succeeded = succeeded,
        };
}
