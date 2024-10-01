using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class ProcessTaskIdChangedLayoutsHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ProcessTaskIdChangedLayoutsHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor)
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

        foreach (string layoutSetName in layoutSetsFile.Sets.Select(layoutSet => layoutSet.Id))
        {
            await ProcessLayoutSet(layoutSetName, notification, repository, cancellationToken);
        }
    }

    private async Task ProcessLayoutSet(string layoutSetName, ProcessTaskIdChangedEvent notification,
        AltinnAppGitRepository repository, CancellationToken cancellationToken)
    {
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetsTaskIdSyncError,
            "App/ui/layout-sets.json",
            async () =>
            {
                bool hasChanges = false;

                var layoutSets = await repository.GetLayoutSetsFile(cancellationToken);
                if (TryChangeLayoutSetTaskIds(layoutSets, notification.OldId, notification.NewId))
                {
                    await repository.SaveLayoutSets(layoutSets);
                    hasChanges = true;
                }

                return hasChanges;
            });

        await ProcessLayouts(layoutSetName, notification, repository, cancellationToken);
    }

    private async Task ProcessLayouts(string layoutSetName, ProcessTaskIdChangedEvent notification,
        AltinnAppGitRepository repository, CancellationToken cancellationToken)
    {
        string[] layoutNames;
        try
        {
            layoutNames = repository.GetLayoutNames(layoutSetName);
        }
        catch (FileNotFoundException)
        {
            return;
        }

        foreach (string layoutName in layoutNames)
        {
            string layoutPath = $"App/ui/{layoutSetName}/{layoutName}.json";

            await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
                notification.EditingContext,
                SyncErrorCodes.LayoutTaskIdSyncError,
                layoutPath,
                async () =>
                {
                    bool hasChanged = false;
                    var layout = await repository.GetLayout(layoutSetName, layoutName, cancellationToken);

                    if (TryChangeLayoutTaskIds(layout, notification.OldId, notification.NewId))
                    {
                        await repository.SaveLayout(layoutSetName, layoutName, layout, cancellationToken);
                        hasChanged = true;
                    }

                    return hasChanged;
                });
        }
    }

    private static bool TryChangeLayoutSetTaskIds(LayoutSets layoutSets, string oldId, string newId)
    {
        string originalLayoutSet = JsonSerializer.Serialize(layoutSets);
        UpdateLayoutSetTaskIds(layoutSets, oldId, newId);
        return !JsonSerializer.Serialize(layoutSets).Equals(originalLayoutSet);
    }

    private static bool TryChangeLayoutTaskIds(JsonNode layout, string oldId, string newId)
    {
        JsonNode originalLayout = layout.DeepClone();
        UpdateLayoutTaskIds(layout, oldId, newId);
        return !layout.ToJsonString().Equals(originalLayout.ToJsonString());
    }

    private static void UpdateLayoutSetTaskIds(LayoutSets layoutSets, string oldId, string newId)
    {
        foreach (var layoutSet in layoutSets.Sets.Where(layoutSet => layoutSet.Tasks.Contains(oldId)))
        {
            layoutSet.Tasks.Remove(oldId);
            layoutSet.Tasks.Add(newId);
        }
    }

    private static void UpdateLayoutTaskIds(JsonNode node, string oldId, string newId)
    {
        if (node is JsonObject jsonObject)
        {
            foreach (var property in jsonObject.ToList())
            {
                if (property.Key == "taskId" && property.Value?.ToString() == oldId)
                {
                    jsonObject["taskId"] = newId;
                }

                UpdateLayoutTaskIds(property.Value, oldId, newId);
            }
        }
        else if (node is JsonArray jsonArray)
        {
            foreach (var item in jsonArray)
            {
                UpdateLayoutTaskIds(item, oldId, newId);
            }
        }
    }
}
