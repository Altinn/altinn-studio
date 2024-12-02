
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;
using System.Text.Json.Nodes;
using Altinn.App.Core.Helpers;

namespace Altinn.Studio.Designer.EventHandlers.LayoutPageDeleted;

public class LayoutPageDeletedHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
    IFileSyncHandlerExecutor fileSyncHandlerExecutor) : INotificationHandler<LayoutPageDeletedEvent>
{
    public async Task Handle(LayoutPageDeletedEvent notification, CancellationToken cancellationToken)
    {
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                notification.EditingContext.Org,
                notification.EditingContext.Repo,
                notification.EditingContext.Developer);

        LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);

        await fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutPageDeletedSyncError,
            "layouts",
            async () =>
            {
                bool hasChanges = false;
                foreach (LayoutSetConfig layoutSet in layoutSets.Sets)
                {
                    Dictionary<string, JsonNode> formLayouts = await altinnAppGitRepository.GetFormLayouts(layoutSet.Id, cancellationToken);
                    foreach (var formLayout in formLayouts)
                    {
                        hasChanges |= await RemoveComponentsReferencingLayout(
                                notification,
                                altinnAppGitRepository,
                                layoutSets.Sets,
                                layoutSet.Id,
                                formLayout,
                                cancellationToken);
                    }
                }
                return hasChanges;
            });
    }

    private static async Task<bool> RemoveComponentsReferencingLayout(LayoutPageDeletedEvent notification, AltinnAppGitRepository altinnAppGitRepository, List<LayoutSetConfig> layoutSets, string layoutSetName, KeyValuePair<string, JsonNode> formLayout, CancellationToken cancellationToken)
    {
        if (formLayout.Value["data"] is not JsonObject data || data["layout"] is not JsonArray layoutArray)
        {
            return false;
        }

        bool hasChanges = false;
        layoutArray.RemoveAll(jsonNode =>
        {
            if (jsonNode["type"]?.GetValue<string>() == "Summary2" && jsonNode["target"] is JsonObject targetObject)
            {
                string summaryType = targetObject["type"]?.GetValue<string>();
                string taskId = targetObject["taskId"]?.GetValue<string>();
                string layouSetId = string.IsNullOrEmpty(taskId) ? layoutSetName : layoutSets?.FirstOrDefault(item => item.Tasks?.Contains(taskId) ?? false)?.Id;
                bool hasLayoutSet = summaryType == "layout" && layouSetId == notification.LayoutSetName;
                if (hasLayoutSet)
                {
                    hasChanges = true;
                    return true;
                }
            }

            return false;
        });

        if (hasChanges)
        {
            await altinnAppGitRepository.SaveLayout(layoutSetName, $"{formLayout.Key}.json", formLayout.Value, cancellationToken);
        }
        return hasChanges;
    }
}
