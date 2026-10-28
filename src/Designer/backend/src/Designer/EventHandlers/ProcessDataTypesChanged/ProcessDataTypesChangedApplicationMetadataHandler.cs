#nullable disable
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessDataTypeChanged;

public class ProcessDataTypesChangedApplicationMetadataHandler : INotificationHandler<ProcessDataTypesChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;
    private readonly IAppVersionService _appVersionService;

    public ProcessDataTypesChangedApplicationMetadataHandler(
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor,
        IAppVersionService appVersionService
    )
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
        _appVersionService = appVersionService;
    }

    public async Task Handle(ProcessDataTypesChangedEvent notification, CancellationToken cancellationToken)
    {
        bool hasChanges = false;
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.ApplicationMetadataDataTypeSyncError,
            "App/config/applicationmetadata.json",
            async () =>
            {
                var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer
                );

                var applicationMetadata = await repository.GetApplicationMetadata(cancellationToken);
                bool usesTaskIds = _appVersionService.UsesDataTypeTaskIds(notification.EditingContext);

                if (
                    notification.ConnectedTaskId != Constants.General.CustomReceiptId
                    && TryChangeDataTypes(
                        applicationMetadata,
                        notification.NewDataTypes,
                        notification.ConnectedTaskId,
                        usesTaskIds
                    )
                )
                {
                    await repository.SaveApplicationMetadata(applicationMetadata);
                    hasChanges = true;
                }

                return hasChanges;
            }
        );
    }

    /// <summary>
    /// Tries to change the data type in the application metadata.
    /// If there are changes, the application metadata is updated and the method returns true.
    /// Otherwise, the method returns false.
    /// </summary>
    private static bool TryChangeDataTypes(
        Application applicationMetadata,
        List<string> newDataTypes,
        string connectedTaskId,
        bool usesTaskIds
    )
    {
        bool hasChanges = false;

        var dataTypesToDisconnect = applicationMetadata.DataTypes.Where(dataType =>
            !newDataTypes.Contains(dataType.Id)
        );
        foreach (var dataTypeToDisconnect in dataTypesToDisconnect)
        {
            hasChanges |= dataTypeToDisconnect.UnbindFromTask(connectedTaskId, usesTaskIds);
        }
        foreach (string newDataType in newDataTypes)
        {
            var dataTypeToUpdate = applicationMetadata.DataTypes.Find(dataType => dataType.Id == newDataType);
            if (dataTypeToUpdate is not null)
            {
                hasChanges |= dataTypeToUpdate.BindToTask(connectedTaskId, usesTaskIds);
            }
        }

        return hasChanges;
    }
}
