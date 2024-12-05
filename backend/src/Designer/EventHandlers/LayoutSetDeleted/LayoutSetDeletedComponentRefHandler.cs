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

namespace Altinn.Studio.Designer.EventHandlers.LayoutSetDeleted;

public class LayoutSetDeletedComponentRefHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IFileSyncHandlerExecutor fileSyncHandlerExecutor, IAppDevelopmentService appDevelopmentService) : INotificationHandler<LayoutSetDeletedEvent>
{
    public async Task Handle(LayoutSetDeletedEvent notification, CancellationToken cancellationToken)
    {
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                notification.EditingContext.Org,
                notification.EditingContext.Repo,
                notification.EditingContext.Developer);

        LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);

        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetSubLayoutSyncError,
            "layouts",
            async () =>
            {
                Dictionary<string, JsonNode> deletedLayouts = await altinnAppGitRepository.GetFormLayouts(notification.LayoutSetName, cancellationToken);

                List<Reference> referencesToDelete = [new Reference("layoutSet", notification.LayoutSetName, notification.LayoutSetName)];

                foreach (KeyValuePair<string, JsonNode> deletedLayout in deletedLayouts)
                {
                    referencesToDelete.Add(new Reference("page", notification.LayoutSetName, deletedLayout.Key));

                    if (deletedLayout.Value["data"] is not JsonObject data || data["layout"] is not JsonArray layoutArray)
                    {
                        continue;
                    }

                    foreach (JsonNode component in layoutArray)
                    {
                        string deletedId = component["id"]?.GetValue<string>();
                        referencesToDelete.Add(new Reference("component", notification.LayoutSetName, deletedId));
                    }
                }

                return await appDevelopmentService.DeleteFromLayouts(notification.EditingContext, referencesToDelete, cancellationToken);
            });
    }
}
