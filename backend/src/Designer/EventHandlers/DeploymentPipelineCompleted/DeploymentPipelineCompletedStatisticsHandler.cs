using System.Threading;
using System.Threading.Tasks;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.DeploymentPipelineCompleted;

public class DeploymentPipelineCompletedStatisticsHandler : INotificationHandler<Events.DeploymentPipelineCompleted>
{

    public async Task Handle(Events.DeploymentPipelineCompleted notification, CancellationToken cancellationToken)
    {
        await Task.CompletedTask;
    }
}
