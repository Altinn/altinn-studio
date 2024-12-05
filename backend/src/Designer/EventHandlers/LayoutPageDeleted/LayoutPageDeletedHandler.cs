
using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutPageDeleted;

public class LayoutPageDeletedHandler(
    IFileSyncHandlerExecutor fileSyncHandlerExecutor,
        IAppDevelopmentService appDevelopmentService,
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory) : INotificationHandler<LayoutPageDeletedEvent>
{
    public async Task Handle(LayoutPageDeletedEvent notification, CancellationToken cancellationToken)
    {
        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutPageDeletedSyncError,
            "layouts",
            async () =>
            {
                AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                        notification.EditingContext.Org,
                        notification.EditingContext.Repo,
                        notification.EditingContext.Developer);

                JsonNode deletedLayout = await altinnAppGitRepository.GetLayout(notification.LayoutSetName, notification.LayoutName, cancellationToken);

                List<Reference> referencesToDelete = [new Reference("page", notification.LayoutSetName, notification.LayoutName)];
                if (deletedLayout["data"] is not JsonObject data || data["layout"] is not JsonArray layoutArray)
                {
                    return false;
                }

                foreach (JsonNode component in layoutArray)
                {
                    string deletedId = component["id"]?.GetValue<string>();
                    referencesToDelete.Add(new Reference("component", notification.LayoutSetName, deletedId));
                }

                return await appDevelopmentService.DeleteFromLayouts(notification.EditingContext, referencesToDelete, cancellationToken);
            });
    }
}
