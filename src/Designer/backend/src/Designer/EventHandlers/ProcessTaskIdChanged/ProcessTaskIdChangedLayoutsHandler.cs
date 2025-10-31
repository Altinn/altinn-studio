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

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class ProcessTaskIdChangedLayoutsHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;
    private readonly IAppDevelopmentService _appDevelopmentService;

    public ProcessTaskIdChangedLayoutsHandler(IFileSyncHandlerExecutor fileSyncHandlerExecutor, IAppDevelopmentService appDevelopmentService)
    {
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
        _appDevelopmentService = appDevelopmentService;
    }

    public async Task Handle(ProcessTaskIdChangedEvent notification, CancellationToken cancellationToken)
    {
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutTaskIdSyncError,
            "layouts",
            async () =>
            {
                List<Reference> referencesToUpdate = [new Reference(ReferenceType.Task, null, notification.OldId, notification.NewId)];
                return await _appDevelopmentService.UpdateLayoutReferences(notification.EditingContext, referencesToUpdate, cancellationToken);
            });
    }
}
