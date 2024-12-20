using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutPageDeleted;

public class LayoutPageDeletedLayoutsHandler(IFileSyncHandlerExecutor fileSyncHandlerExecutor, IAppDevelopmentService appDevelopmentService) : INotificationHandler<LayoutPageDeletedEvent>
{
    public async Task Handle(LayoutPageDeletedEvent notification, CancellationToken cancellationToken)
    {
        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutPageDeletedLayoutsSyncError,
            "layouts",
            async () =>
            {
                List<Reference> referencesToDelete = [new Reference("page", notification.LayoutSetName, notification.LayoutName)];
                return await appDevelopmentService.UpdateLayoutReferences(notification.EditingContext, referencesToDelete, cancellationToken);
            });
    }
}
