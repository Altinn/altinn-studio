using System.IO;
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
            string[] layoutNames;
            try
            {
                layoutNames = repository.GetLayoutNames(layoutSetName);
            }
            catch (FileNotFoundException)
            {
                continue;
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
    }

    private static bool TryChangeLayoutTaskIds(JsonNode node, string oldId, string newId)
    {
        bool hasChanged = false;

        if (node is JsonObject jsonObject)
        {
            foreach (var property in jsonObject.ToList())
            {
                if (property.Key == "taskId" && property.Value?.ToString() == oldId)
                {
                    jsonObject["taskId"] = newId;
                    hasChanged = true;
                }

                hasChanged |= TryChangeLayoutTaskIds(property.Value, oldId, newId);
            }
        }
        else if (node is JsonArray jsonArray)
        {
            foreach (var element in jsonArray)
            {
                hasChanged |= TryChangeLayoutTaskIds(element, oldId, newId);
            }
        }

        return hasChanged;
    }
}
