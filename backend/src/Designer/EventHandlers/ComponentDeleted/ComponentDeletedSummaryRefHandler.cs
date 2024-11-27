using System.Linq;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Helpers;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ComponentDeleted;

public class ComponentDeletedSummaryRefHandler : INotificationHandler<ComponentDeletedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ComponentDeletedSummaryRefHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IFileSyncHandlerExecutor fileSyncHandlerExecutor)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
    }

    public async Task Handle(ComponentDeletedEvent notification, CancellationToken cancellationToken)
    {
        bool hasChanges = false;
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.ComponentDeletedSummaryRefSyncError,
            "layouts",
            async () =>
            {
                AltinnAppGitRepository repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer);

                if (!repository.AppUsesLayoutSets())
                {
                    return hasChanges;
                }

                return await DeleteSummaryComponents(repository, notification.LayoutSetName, notification.ComponentId, cancellationToken);
            });

    }

    private async Task<bool> DeleteSummaryComponents(AltinnAppGitRepository altinnAppGitRepository, string deletedComponentLayoutSetId, string deletedComponentId, CancellationToken cancellationToken)
    {
        bool hasChanged = false;

        LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);

        foreach (LayoutSetConfig layoutSetConfig in layoutSets.Sets)
        {
            string[] layoutNames = altinnAppGitRepository.GetLayoutNames(layoutSetConfig.Id);
            foreach (string layoutName in layoutNames)
            {
                JsonNode layout = await altinnAppGitRepository.GetLayout(layoutSetConfig.Id, layoutName);

                if (layout?["data"]?["layout"] is not JsonArray layoutArray)
                {
                    continue;
                }

                int initialCount = layoutArray.Count;
                layoutArray.RemoveAll(layoutObject =>
                {
                    if (layoutObject["type"]?.GetValue<string>() != "Summary2" || layoutObject["target"] is not JsonObject targetObject)
                    {
                        return false;
                    }

                    string summaryType = targetObject["type"]?.GetValue<string>();
                    string id = targetObject["id"]?.GetValue<string>();
                    string taskId = targetObject["taskId"]?.GetValue<string>();
                    string layouSetId = string.IsNullOrEmpty(taskId) ? layoutSetConfig.Id : layoutSets.Sets.FirstOrDefault(item => item.Tasks.Contains(taskId))?.Id;

                    return summaryType == "component" && layouSetId == deletedComponentLayoutSetId && id == deletedComponentId;
                });

                if (layoutArray.Count != initialCount)
                {
                    await altinnAppGitRepository.SaveLayout(layoutSetConfig.Id, layoutName, layout, cancellationToken);
                    hasChanged = true;
                }
            }
        }

        return hasChanged;
    }
}
