using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Helpers;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutSetDeleted;

public class LayoutSetDeletedComponentRefHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IFileSyncHandlerExecutor fileSyncHandlerExecutor) : INotificationHandler<LayoutSetDeletedEvent>
{
    public async Task Handle(LayoutSetDeletedEvent notification, CancellationToken cancellationToken)
    {
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(notification.EditingContext.Org, notification.EditingContext.Repo, notification.EditingContext.Developer);

        string[] layoutSetNames = altinnAppGitRepository.GetLayoutSetNames();

        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetSubLayoutSyncError,
            "layouts",
            async () =>
            {
                bool hasChanges = false;
                foreach (string layoutSetName in layoutSetNames)
                {
                    Dictionary<string, JsonNode> task = await altinnAppGitRepository.GetFormLayouts(layoutSetName, cancellationToken);
                    foreach (KeyValuePair<string, JsonNode> formLayout in task)
                    {
                        hasChanges |= await RemoveComponentsReferencingLayoutSet(notification, altinnAppGitRepository, layoutSetName, formLayout, cancellationToken);
                    }
                }
                return hasChanges;
            });
    }

    async Task<bool> RemoveComponentsReferencingLayoutSet(LayoutSetDeletedEvent notification, AltinnAppGitRepository altinnAppGitRepository, string layoutSetName, KeyValuePair<string, JsonNode> formLayout, CancellationToken cancellationToken)
    {
        if (formLayout.Value["data"] == null || formLayout.Value["data"]["layout"] == null)
        {
            return false;
        }

        bool hasChanges = false;
        JsonArray jsonArray = formLayout.Value["data"]["layout"] as JsonArray;
        jsonArray.RemoveAll(jsonNode =>
        {
            if (jsonNode["layoutSet"] != null && jsonNode["layoutSet"].GetValue<string>() == notification.LayoutSetId)
            {
                hasChanges = true;
                return true;
            }
            return false;
        });

        if (hasChanges)
        {
            await altinnAppGitRepository.SaveLayout(layoutSetName, formLayout.Key + ".json", formLayout.Value, cancellationToken);
            return true;
        }
        return false;
    }
}
