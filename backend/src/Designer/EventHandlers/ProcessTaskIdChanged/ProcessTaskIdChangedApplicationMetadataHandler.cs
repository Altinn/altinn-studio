using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class ProcessTaskIdChangedApplicationMetadataHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ProcessTaskIdChangedApplicationMetadataHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
    }

    public async Task Handle(ProcessTaskIdChangedEvent notification, CancellationToken cancellationToken)
    {
        bool hasChanges = false;
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.ApplicationMetadataTaskIdSyncError,
            "App/config/applicationmetadata.json",
            async () =>
            {
                var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer);

                var applicationMetadata = await repository.GetApplicationMetadata(cancellationToken);

                if (TryChangeTaskIds(applicationMetadata, notification.OldId, notification.NewId))
                {
                    await repository.SaveApplicationMetadata(applicationMetadata);
                    hasChanges = true;
                }

                return hasChanges;
            });
    }

    /// <summary>
    /// Tries to change the task ids in the application metadata.
    /// If there are changes, the application metadata is updated and the method returns true.
    /// Otherwise, the method returns false.
    /// </summary>
    private static bool TryChangeTaskIds(Application applicationMetadata, string oldId, string newId)
    {
        bool hasChanges = false;
        foreach (DataType applicationMetadataDataType in applicationMetadata.DataTypes.Where(x =>
                     x.TaskId == oldId))
        {
            applicationMetadataDataType.TaskId = newId;
            hasChanges = true;
        }

        return hasChanges;
    }
}
