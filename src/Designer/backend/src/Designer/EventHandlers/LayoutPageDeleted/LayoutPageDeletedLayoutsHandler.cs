using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
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
                List<Reference> referencesToDelete = [new Reference(ReferenceType.Layout, notification.LayoutSetName, notification.LayoutName)];
                return await appDevelopmentService.UpdateLayoutReferences(notification.EditingContext, referencesToDelete, cancellationToken);
            });
    }
}
