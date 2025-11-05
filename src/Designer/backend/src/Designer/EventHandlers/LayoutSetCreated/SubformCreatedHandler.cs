#nullable disable
using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutSetCreated;

public class SubformCreatedHandler(
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor,
        IAppDevelopmentService appDevelopmentService
) : INotificationHandler<LayoutSetCreatedEvent>
{
    public async Task Handle(
            LayoutSetCreatedEvent notification,
            CancellationToken cancellationToken)
    {

        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                notification.EditingContext.Org,
                notification.EditingContext.Repo,
                notification.EditingContext.Developer);

        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetSubFormButtonSyncError,
            "layouts",
            async () =>
            {
                if (notification.LayoutSet.Type == "subform")
                {
                    Dictionary<string, JsonNode> formLayouts = await altinnAppGitRepository.GetFormLayouts(notification.LayoutSet.Id, cancellationToken);
                    foreach (string formLayoutName in formLayouts.Keys)
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
                        await appDevelopmentService.AddComponentToLayout(notification.EditingContext, notification.LayoutSet.Id, formLayoutName, buttonComponent, cancellationToken);
                    }
                    return true;
                }
                return false;
            }
        );
    }
}
