using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Models;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessDataTypeChanged;

public class ProcessDataTypeChangedLayoutSetsHandler : INotificationHandler<ProcessDataTypeChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ProcessDataTypeChangedLayoutSetsHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
    }

    public async Task Handle(ProcessDataTypeChangedEvent notification, CancellationToken cancellationToken)
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
                if (TryChangeDataType(layoutSets, notification.OldDataType, notification.NewDataType))
                {
                    await repository.SaveLayoutSetsFile(layoutSets);
                }
            });
    }

    private static bool TryChangeDataType(LayoutSets layoutSets, string oldDataType, string newDataType)
    {
        bool hasChanges = false;
        var layoutSet = layoutSets.Sets?.Find(layoutSet => layoutSet.DataType == oldDataType);
        if (layoutSet is not null)
        {
            layoutSet.DataType = newDataType;
            hasChanges = true;
        }

        return hasChanges;
    }

}
