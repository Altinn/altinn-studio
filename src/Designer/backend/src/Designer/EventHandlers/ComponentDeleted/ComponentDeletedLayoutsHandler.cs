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

namespace Altinn.Studio.Designer.EventHandlers.ComponentDeleted;

public class ComponentDeletedLayoutsHandler(IFileSyncHandlerExecutor fileSyncHandlerExecutor, IAppDevelopmentService appDevelopmentService) : INotificationHandler<ComponentDeletedEvent>
{
    public async Task Handle(ComponentDeletedEvent notification, CancellationToken cancellationToken)
    {
        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.ComponentDeletedLayoutsSyncError,
            "layouts",
            async () =>
            {
                List<Reference> referencesToDelete = [new Reference(ReferenceType.Component, notification.LayoutSetName, notification.ComponentId)];
                return await appDevelopmentService.UpdateLayoutReferences(notification.EditingContext, referencesToDelete, cancellationToken);
            });
    }
}
