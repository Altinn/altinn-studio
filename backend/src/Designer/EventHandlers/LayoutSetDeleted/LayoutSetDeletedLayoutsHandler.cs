using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutSetDeleted;

public class LayoutSetDeletedLayoutsHandler(IFileSyncHandlerExecutor fileSyncHandlerExecutor, IAppDevelopmentService appDevelopmentService) : INotificationHandler<LayoutSetDeletedEvent>
{
    public async Task Handle(LayoutSetDeletedEvent notification, CancellationToken cancellationToken)
    {
        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetDeletedLayoutsSyncError,
            "layouts",
            async () =>
            {
                List<Reference> referencesToDelete = [new Reference("layoutSet", notification.LayoutSetName, notification.LayoutSetName)];
                return await appDevelopmentService.UpdateLayoutReferences(notification.EditingContext, referencesToDelete, cancellationToken);
            });
    }
}
