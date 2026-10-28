using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutSetDeleted;

/// <summary>
/// Removes the deleted UI folder from the subform PDF tasks that name it in <c>subformUiFolder</c>, as Designer
/// removes other references to a deleted UI folder. The task's configuration panel then asks for a folder, where
/// a dangling name would only fail when the app starts. Only v9 apps have the setting.
/// </summary>
public class LayoutSetDeletedProcessHandler(
    IAppVersionService appVersionService,
    IFileSyncHandlerExecutor fileSyncHandlerExecutor,
    IProcessModelingService processModelingService
) : INotificationHandler<LayoutSetDeletedEvent>
{
    public async Task Handle(LayoutSetDeletedEvent notification, CancellationToken cancellationToken)
    {
        if (!appVersionService.IsV9App(notification.EditingContext))
        {
            return;
        }

        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetDeletedProcessSyncError,
            "App/config/process/process.bpmn",
            () =>
                processModelingService.UpdateSubformUiFolder(
                    notification.EditingContext,
                    notification.LayoutSetName,
                    null,
                    cancellationToken
                )
        );
    }
}
