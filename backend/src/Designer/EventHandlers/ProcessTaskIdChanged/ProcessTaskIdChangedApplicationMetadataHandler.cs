using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class ProcessTaskIdChangedApplicationMetadataHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    public Task Handle(ProcessTaskIdChangedEvent notification, CancellationToken cancellationToken)
    {
        // TODO: Implement logic to handle the event here: https://github.com/Altinn/altinn-studio/issues/12220
        // Here we should think how to handle errors in the handlers. Should we throw exceptions or use websocket to send error messages to the client?
        return Task.CompletedTask;
    }
}
