using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.SubformPdfConfigUpgraded;

/// <summary>
/// Removes the UI folder that earlier Designer versions created for a subform PDF task, once the task names its
/// subform's UI folder. The app shows every page in the folder's <c>pages.order</c> while the task runs, so the
/// generated waiting page would otherwise replace the app's own waiting view.
/// </summary>
public class SubformPdfConfigUpgradedUiFoldersHandler(
    IFileSyncHandlerExecutor fileSyncHandlerExecutor,
    IUiFoldersService uiFoldersService
) : INotificationHandler<SubformPdfConfigUpgradedEvent>
{
    public async Task Handle(SubformPdfConfigUpgradedEvent notification, CancellationToken cancellationToken)
    {
        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.SubformPdfConfigUpgradeSyncError,
            $"App/ui/{notification.Upgrade.TaskId}",
            () =>
                uiFoldersService.DeleteGeneratedSubformPdfTaskUiFolder(
                    notification.EditingContext,
                    notification.Upgrade.TaskId,
                    notification.Upgrade.SubformComponentId,
                    cancellationToken
                )
        );
    }
}
