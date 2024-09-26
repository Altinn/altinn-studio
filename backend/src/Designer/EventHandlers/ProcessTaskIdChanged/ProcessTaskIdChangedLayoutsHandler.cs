using System.Linq;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class ProcessTaskIdChangedLayoutsHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ProcessTaskIdChangedLayoutsHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IFileSyncHandlerExecutor fileSyncHandlerExecutor)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
    }

    public async Task Handle(ProcessTaskIdChangedEvent notification, CancellationToken cancellationToken)
    {
        var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            notification.EditingContext.Org,
            notification.EditingContext.Repo,
            notification.EditingContext.Developer);

        if (!repository.AppUsesLayoutSets())
        {
            return;
        }

        var layoutSetsFile = await repository.GetLayoutSetsFile(cancellationToken);

        bool hasChanges = false;
        foreach (var layoutSet in layoutSetsFile.Sets)
        {
            string layoutSetName = layoutSet.Id;
            string[] layoutNames = repository.GetLayoutNames(layoutSetName);
            foreach (string layoutName in layoutNames)
            {
                string layoutPath = $"App/ui/{layoutSetName}/{layoutName}.json";
                await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
                    notification.EditingContext,
                    SyncErrorCodes.LayoutTaskIdSyncError,
                    layoutPath,
                    async () =>
                    {
                        var layout = await repository.GetLayout(layoutSetName, layoutName, cancellationToken);

                        if (TryChangeTaskIds(layout, notification.OldId, notification.NewId))
                        {
                            await repository.SaveLayout(layoutSetName, layoutName, layout, cancellationToken);
                            hasChanges = true;
                        }

                        return hasChanges;
                    });
            }
        }
    }

    private static bool TryChangeTaskIds(JsonNode layout, string oldId, string newId)
    {
        JsonNode originalLayout = layout.DeepClone();

        UpdateTaskIds(layout, oldId, newId);

        return !layout.ToJsonString().Equals(originalLayout.ToJsonString());
    }

    private static void UpdateTaskIds(JsonNode node, string oldId, string newId)
    {
        if (node is JsonObject jsonObject)
        {
            foreach (var property in jsonObject.ToList())
            {
                if (property.Key == "taskId" && property.Value?.ToString() == oldId)
                {
                    jsonObject["taskId"] = newId;
                }
                UpdateTaskIds(property.Value, oldId, newId);
            }
        }
        else if (node is JsonArray jsonArray)
        {
            foreach (var item in jsonArray)
            {
                UpdateTaskIds(item, oldId, newId);
            }
        }
    }
}
