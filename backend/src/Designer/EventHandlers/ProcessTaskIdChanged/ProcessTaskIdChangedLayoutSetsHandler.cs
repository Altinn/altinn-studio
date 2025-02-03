using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
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
        var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            notification.EditingContext.Org,
            notification.EditingContext.Repo,
            notification.EditingContext.Developer);

        if (!repository.AppUsesLayoutSets())
        {
            return;
        }

        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetsTaskIdSyncError,
            "App/ui/layout-sets.json",
            async () =>
            {
                bool hasChanged = false;

                var layoutSets = await repository.GetLayoutSetsFile(cancellationToken);
                if (TryChangeLayoutSetTaskIds(layoutSets, notification.OldId, notification.NewId))
                {
                    await repository.SaveLayoutSets(layoutSets);
                    hasChanged = true;
                }

                return hasChanged;
            });
    }

    private static bool TryChangeLayoutSetTaskIds(LayoutSets layoutSets, string oldId, string newId)
    {
        bool hasChanged = false;
        foreach (var layoutSet in layoutSets.Sets.Where(layoutSet => layoutSet.Tasks != null && layoutSet.Tasks.Contains(oldId)))
        {
            layoutSet.Tasks!.Remove(oldId);
            layoutSet.Tasks!.Add(newId);
            hasChanged = true;
        }

        return hasChanged;
    }
}
