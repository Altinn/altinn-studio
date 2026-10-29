using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutSetIdChanged;

/// <summary>
/// Renames the UI folder in the subform PDF tasks that name it in <c>subformUiFolder</c>. The app does not start
/// when that setting names a folder that does not exist. Only v9 apps have the setting.
/// </summary>
public class LayoutSetIdChangedProcessHandler(
    IAppVersionService appVersionService,
    IFileSyncHandlerExecutor fileSyncHandlerExecutor,
    IProcessModelingService processModelingService
) : INotificationHandler<LayoutSetIdChangedEvent>
{
    public async Task Handle(LayoutSetIdChangedEvent notification, CancellationToken cancellationToken)
    {
        if (!appVersionService.IsV9App(notification.EditingContext))
        {
            return;
        }

        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetIdChangedProcessSyncError,
            "App/config/process/process.bpmn",
            () =>
                processModelingService.UpdateSubformUiFolder(
                    notification.EditingContext,
                    notification.LayoutSetName,
                    notification.NewLayoutSetName,
                    cancellationToken
                )
        );
    }
}
