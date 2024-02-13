using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class ProcessTaskIdChangedPolicyFileHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    private readonly IHubContext<SyncHub, ISyncClient> _hubContext;

    public ProcessTaskIdChangedPolicyFileHandler(IHubContext<SyncHub, ISyncClient> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task Handle(ProcessTaskIdChangedEvent notification, CancellationToken cancellationToken)
    {
        // TODO: Implement logic for updating policy files
        return Task.CompletedTask;
    }
}
