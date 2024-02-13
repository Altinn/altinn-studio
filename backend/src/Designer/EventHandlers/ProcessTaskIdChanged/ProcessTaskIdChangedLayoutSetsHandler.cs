using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class ProcessTaskIdChangedLayoutSetsHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    private readonly IHubContext<SyncHub, ISyncClient> _hubContext;

    public ProcessTaskIdChangedLayoutSetsHandler(IHubContext<SyncHub, ISyncClient> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task Handle(ProcessTaskIdChangedEvent notification, CancellationToken cancellationToken)
    {
        // TODO: Implement logic for updating layout sets
        return Task.CompletedTask;
    }
}
