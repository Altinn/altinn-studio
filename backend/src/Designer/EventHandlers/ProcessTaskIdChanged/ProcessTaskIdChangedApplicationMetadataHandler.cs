using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class ProcessTaskIdChangedApplicationMetadataHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    public Task Handle(ProcessTaskIdChangedEvent notification, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
