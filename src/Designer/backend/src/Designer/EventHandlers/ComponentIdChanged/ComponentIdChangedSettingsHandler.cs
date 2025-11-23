#nullable disable
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ComponentIdChanged;

public class ComponentIdChangedSettingsHandler : INotificationHandler<ComponentIdChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ComponentIdChangedSettingsHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
    }

    public async Task Handle(ComponentIdChangedEvent notification, CancellationToken cancellationToken)
    {
        var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            notification.EditingContext.Org,
            notification.EditingContext.Repo,
            notification.EditingContext.Developer);

        JsonNode layoutSettings =
            await repository.GetLayoutSettingsAndCreateNewIfNotFound(notification.LayoutSetName, cancellationToken);

        bool hasChanges = false;
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.SettingsComponentIdSyncError,
            $"App/ui/{notification.LayoutSetName}/Settings.json",
            async () =>
            {
                if (TryChangeComponentId(layoutSettings, notification.OldComponentId, notification.NewComponentId))
                {
                    await repository.SaveLayoutSettings(notification.LayoutSetName, layoutSettings);
                    hasChanges = true;
                }

                return hasChanges;
            });
    }

    /// <summary>
    /// Tries to change the componentId in the `excludeFromPdf` for components in the layout settings file.
    /// If there are changes, the layout file is updated and the method returns true.
    /// Otherwise, the method returns false.
    /// </summary>
    public bool TryChangeComponentId(JsonNode layoutSettings, string oldComponentId, string newComponentId)
    {
        bool hasChanges = false;

        var excludeFromPdf = layoutSettings?["components"]?["excludeFromPdf"];

        if (excludeFromPdf is JsonArray excludeFromPdfArray)
        {
            for (int i = 0; i < excludeFromPdfArray.Count; i++)
            {
                string currentComponentId = excludeFromPdfArray[i]?.ToString();
                if (currentComponentId == oldComponentId)
                {
                    hasChanges = true;
                    if (string.IsNullOrEmpty(newComponentId))
                    {
                        excludeFromPdfArray.RemoveAt(i);
                        break;
                    }
                    excludeFromPdfArray[i] = newComponentId;
                    break;
                }
            }
        }
        return hasChanges;
    }
}
