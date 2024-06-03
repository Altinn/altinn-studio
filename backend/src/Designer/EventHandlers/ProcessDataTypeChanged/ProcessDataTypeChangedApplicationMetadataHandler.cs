using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessDataTypeChanged;

public class ProcessDataTypeChangedApplicationMetadataHandler : INotificationHandler<ProcessDataTypeChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ProcessDataTypeChangedApplicationMetadataHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
    }

    public async Task Handle(ProcessDataTypeChangedEvent notification, CancellationToken cancellationToken)
    {
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandling(
            notification.EditingContext,
            SyncErrorCodes.ApplicationMetadataDataTypeSyncError,
            "App/config/applicationmetadata.json", async () =>
            {
                var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer);

                var applicationMetadata = await repository.GetApplicationMetadata(cancellationToken);

                if (notification.ConnectedTaskId != Constants.General.CustomReceiptId && TryChangeDataType(applicationMetadata, notification.NewDataType, notification.ConnectedTaskId))
                {
                    await repository.SaveApplicationMetadata(applicationMetadata);
                }
            });
    }

    /// <summary>
    /// Tries to change the data type in the application metadata.
    /// If there are changes, the application metadata is updated and the method returns true.
    /// Otherwise, the method returns false.
    /// </summary>
    private static bool TryChangeDataType(Application applicationMetadata, string newDataType, string connectedTaskId)
    {
        bool hasChanges = false;


        var dataTypeToDisconnect = applicationMetadata.DataTypes.Find(dataType => dataType.TaskId == connectedTaskId);
        if (dataTypeToDisconnect is not null)
        {
            dataTypeToDisconnect.TaskId = null;
            hasChanges = true;
        }
        if (!string.IsNullOrEmpty(newDataType))
        {
            var dataTypeToUpdate = applicationMetadata.DataTypes.Find(dataType => dataType.Id == newDataType);
            // Only update taskId on appMetaData dataType if the new connected dataType for the layout set exists in appMetaData
            if (dataTypeToUpdate is not null)
            {
                dataTypeToUpdate.TaskId = connectedTaskId;
                hasChanges = true;
            }
        }

        return hasChanges;
    }

}
