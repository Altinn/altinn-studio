using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ComponentIdChanged;

public class ComponentIdChangedLayoutsHandler : INotificationHandler<ComponentIdChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ComponentIdChangedLayoutsHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
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

        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
                notification.EditingContext,
                SyncErrorCodes.LayoutSetComponentIdSyncError,
                "App/ui/layouts",
                async () =>
                {
                    bool hasChanges = false;
                    string[] layoutNames = repository.GetLayoutNames(notification.LayoutSetName);
                    foreach (var layoutName in layoutNames)
                    {
                        var layout = await repository.GetLayout(notification.LayoutSetName, layoutName, cancellationToken);
                        if (TryChangeComponentId(layout, notification.OldComponentId, notification.NewComponentId))
                        {
                            await repository.SaveLayout(notification.LayoutSetName, layoutName, layout, cancellationToken);
                            hasChanges = true;
                        }
                    }
                    return hasChanges;
                });
    }

    /// <summary>
    /// Tries to change the componentId in different occurrences in a single layout file.
    /// Occurrences can be references in expressions in boolean fields, textResourceBindings or in hiddenRow in groups
    /// If there are changes, the layout file is updated and the method returns true.
    /// Otherwise, the method returns false.
    /// </summary>
    public bool TryChangeComponentId(JsonNode layout, string oldComponentId, string newComponentId)
    {
        JsonNode originalLayout = layout.DeepClone();

        FindIdOccurrencesRecursive(layout, oldComponentId, newComponentId);

        return !layout.ToJsonString().Equals(originalLayout.ToJsonString());
    }

    private void FindIdOccurrencesRecursive(JsonNode node, string oldComponentId, string newComponentId)
    {
        // Should we check if node is string to avoid unnecessary upcoming checks?
        if (node is JsonObject jsonObject)
        {
            if (jsonObject["component"] is not null)
            {
                // Objects that references components i.e. in `rowsAfter` in RepeatingGroup
                UpdateComponentIdActingAsCellMemberInRepeatingGroup(jsonObject, oldComponentId, newComponentId);
            }
            else if (jsonObject["tableHeaders"] is JsonArray tableHeadersArray)
            {
                // Objects that references components in `tableHeaders` in RepeatingGroup
                UpdateComponentIdActingAsTableHeaderInRepeatingGroup(tableHeadersArray, oldComponentId, newComponentId);
            }
            else if (jsonObject["componentRef"] is not null)
            {
                // Components that are used in summary components will have this ref
                UpdateComponentIdActingAsComponentRefInSummary(jsonObject, oldComponentId, newComponentId);
            }
            foreach (var property in jsonObject)
            {
                FindIdOccurrencesRecursive(property.Value, oldComponentId, newComponentId);
            }
        }
        else if (node is JsonArray jsonArray)
        {
            // Property is possibly an Expression that may include a component-reference
            foreach (var item in jsonArray)
            {
                if (item is JsonArray jsonInnerArray && jsonInnerArray.Count == 2 && item[0]?.ToString() == "component" && item[1]?.ToString() == oldComponentId)
                {
                    UpdateComponentIdActingAsExpressionMember(jsonInnerArray, newComponentId);
                }
                else
                {
                    FindIdOccurrencesRecursive(item, oldComponentId, newComponentId);
                }
            }
        }
    }

    private void UpdateComponentIdActingAsExpressionMember(JsonArray jsonArray, string newComponentId)
    {
        jsonArray[1] = newComponentId;
    }

    private void UpdateComponentIdActingAsCellMemberInRepeatingGroup(JsonNode jsonNode, string oldComponentId, string newComponentId)
    {
        if (jsonNode["component"]?.ToString() == oldComponentId)
        {
            jsonNode["component"] = newComponentId;
        }
    }

    private void UpdateComponentIdActingAsTableHeaderInRepeatingGroup(JsonArray jsonArray, string oldComponentId, string newComponentId)
    {
        for (int i = 0; i < jsonArray.Count; i++)
        {
            string currentComponentId = jsonArray[i]?.ToString();
            if (currentComponentId == oldComponentId)
            {
                if (string.IsNullOrEmpty(newComponentId))
                {
                    jsonArray.RemoveAt(i);
                    break;
                }
                jsonArray[i] = newComponentId;
                break;
            }
        }
    }

    private void UpdateComponentIdActingAsComponentRefInSummary(JsonNode jsonNode, string oldComponentId, string newComponentId)
    {
        if (jsonNode["componentRef"]?.ToString() == oldComponentId)
        {
            jsonNode["componentRef"] = newComponentId;
        }
    }
}
