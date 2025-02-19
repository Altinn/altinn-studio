using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutPageAdded;

public class SubformCreatedHandler(
        IAppDevelopmentService appDevelopmentService,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor
) : INotificationHandler<LayoutPageAddedEvent>
{
    public async Task Handle(
            LayoutPageAddedEvent notification,
            CancellationToken cancellationToken)
    {

        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetSubFormButtonSyncError,
            "layouts",
            async () =>
            {
                if (notification.LayoutSetConfig.Type == "subform")
                {
                    Guid guid = Guid.NewGuid();
                    string randomId = guid.ToString().Split('-')[0];
                    object buttonComponent = new
                    {
                        id = $"CloseSubformButton-{randomId}",
                        type = "CustomButton",
                        actions = new[] {
                            new {
                                type = "ClientAction",
                                id = "closeSubform"
                            }},
                    };
                    await appDevelopmentService.AddComponentToLayout(notification.EditingContext, notification.LayoutSetConfig.Id, notification.LayoutName, buttonComponent, cancellationToken);
                    return true;
                }
                return false;
            });
    }
}
