#nullable disable
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutSetIdChanged;

public class LayoutSetIdChangedLayoutsHandler(IFileSyncHandlerExecutor fileSyncHandlerExecutor, IAppDevelopmentService appDevelopmentService) : INotificationHandler<LayoutSetIdChangedEvent>
{
    public async Task Handle(LayoutSetIdChangedEvent notification, CancellationToken cancellationToken)
    {
        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetIdChangedLayoutsSyncError,
            "layouts",
            async () =>
            {
                List<Reference> referencesToUpdate = [new Reference(ReferenceType.LayoutSet, notification.LayoutSetName, notification.LayoutSetName, notification.NewLayoutSetName)];
                return await appDevelopmentService.UpdateLayoutReferences(notification.EditingContext, referencesToUpdate, cancellationToken);
            });
    }
}
