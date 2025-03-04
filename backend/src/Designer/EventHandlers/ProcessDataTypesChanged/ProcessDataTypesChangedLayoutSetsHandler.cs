using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessDataTypeChanged;

public class ProcessDataTypesChangedLayoutSetsHandler : INotificationHandler<ProcessDataTypesChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ProcessDataTypesChangedLayoutSetsHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
    }

    public async Task Handle(ProcessDataTypesChangedEvent notification, CancellationToken cancellationToken)
    {
        bool hasChanges = false;
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetsDataTypeSyncError,
            "App/ui/layout-sets.json",
            async () =>
            {
                var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer);

                if (!repository.AppUsesLayoutSets())
                {
                    return hasChanges;
                }

                var layoutSets = await repository.GetLayoutSetsFile(cancellationToken);
                if (TryChangeDataTypes(layoutSets, notification.NewDataTypes, notification.ConnectedTaskId))
                {
                    await repository.SaveLayoutSets(layoutSets);
                    hasChanges = true;
                }

                return hasChanges;
            });
    }

    private static bool TryChangeDataTypes(LayoutSets layoutSets, List<string> newDataTypes, string connectedTaskId)
    {
        bool hasChanges = false;
        var layoutSet = layoutSets.Sets?.Find(layoutSet => layoutSet.Tasks?[0] == connectedTaskId);
        if (layoutSet is not null && !newDataTypes.Contains(layoutSet.DataType))
        {
            layoutSet.DataType = newDataTypes[0];
            hasChanges = true;
        }

        return hasChanges;
    }

}
