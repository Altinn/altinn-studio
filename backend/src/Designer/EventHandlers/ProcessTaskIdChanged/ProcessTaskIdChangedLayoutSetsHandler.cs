using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class ProcessTaskIdChangedLayoutSetsHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    private readonly IHubContext<SyncHub, ISyncClient> _hubContext;
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

    public ProcessTaskIdChangedLayoutSetsHandler(IHubContext<SyncHub, ISyncClient> hubContext, IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _hubContext = hubContext;
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }

    public async Task Handle(ProcessTaskIdChangedEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                notification.EditingContext.Org,
                notification.EditingContext.Repo,
                notification.EditingContext.Developer);

            if (!repository.AppUsesLayoutSets())
            {
                return;
            }

            var layoutSets = await repository.GetLayoutSetsFile(cancellationToken);
            if (TryChangeTaskIds(layoutSets, notification.OldId, notification.NewId))
            {
                await repository.SaveLayoutSetsFile(layoutSets);
            }
        }
        catch (Exception e)
        {
            SyncError error = new(
                SyncErrorCodes.LayoutSetsTaskIdSyncError,
                new ErrorSource(
                    "layout-sets.json",
                    "App/ui/layout-sets.json"
                ),
                e.Message
            );

            await _hubContext.Clients.Group(notification.EditingContext.Developer).FileSyncError(error);
        }
    }

    private bool TryChangeTaskIds(LayoutSets layoutSets, string oldId, string newId)
    {
        bool changed = false;
        foreach (var layoutSet in layoutSets.Sets.Where(layoutSet => layoutSet.Tasks.Contains(oldId)))
        {
            layoutSet.Tasks.Remove(oldId);
            layoutSet.Tasks.Add(newId);
            changed = true;
        }

        return changed;
    }
}
