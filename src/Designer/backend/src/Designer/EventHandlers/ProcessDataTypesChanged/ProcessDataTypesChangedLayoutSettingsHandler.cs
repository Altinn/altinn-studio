#nullable disable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessDataTypeChanged;

public class ProcessDataTypesChangedLayoutSettingsHandler : INotificationHandler<ProcessDataTypesChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;
    private readonly IAppVersionService _appVersionService;

    public ProcessDataTypesChangedLayoutSettingsHandler(
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
        string layoutSettingsFilePath = $"App/ui/{notification.ConnectedTaskId}/Settings.json";
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSettingsDataTypeSyncError,
            layoutSettingsFilePath,
            async () =>
            {
                var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer
                );

                if (_appVersionService.GetAppLibVersion(notification.EditingContext).Major < 9)
                {
                    return hasChanges;
                }

                // In v9, the layout set folder name equals the task ID.
                LayoutSettings layoutSettings = await repository.GetLayoutSettings(
                    notification.ConnectedTaskId,
                    cancellationToken
                );

                string newDataType = notification.NewDataTypes.Count > 0 ? notification.NewDataTypes[0] : null;
                if (layoutSettings.DataType == newDataType)
                {
                    return hasChanges;
                }

                layoutSettings.DataType = newDataType;
                await repository.SaveLayoutSettings(notification.ConnectedTaskId, layoutSettings);
                hasChanges = true;
                return hasChanges;
            }
        );
    }
}
