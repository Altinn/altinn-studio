using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class ProcessTaskIdChangedLayoutSetsHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ProcessTaskIdChangedLayoutSetsHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
    }

    public async Task Handle(ProcessTaskIdChangedEvent notification, CancellationToken cancellationToken)
    {
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandling(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetsTaskIdSyncError,
            "App/ui/layout-sets.json",
            async () =>
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
            });
    }

    private static bool TryChangeTaskIds(LayoutSets layoutSets, string oldId, string newId)
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
