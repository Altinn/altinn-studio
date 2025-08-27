using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutPageIdChanged;

public class LayoutPageIdChangedLayoutsHandler(IFileSyncHandlerExecutor fileSyncHandlerExecutor, IAppDevelopmentService appDevelopmentService) : INotificationHandler<LayoutPageIdChangedEvent>
{
    public async Task Handle(LayoutPageIdChangedEvent notification, CancellationToken cancellationToken)
    {
        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutPageIdChangedLayoutsSyncError,
            "layouts",
            async () =>
            {
                List<Reference> referencesToUpdate = [new Reference(ReferenceType.Layout, notification.LayoutSetName, notification.LayoutName, notification.NewLayoutName)];
                return await appDevelopmentService.UpdateLayoutReferences(notification.EditingContext, referencesToUpdate, cancellationToken);
            });
    }
}
