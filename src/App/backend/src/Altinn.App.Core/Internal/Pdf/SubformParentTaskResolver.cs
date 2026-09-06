using System.Text.Json;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Resolves which process task's UI layout hosts a given Subform component, so a subform PDF's URL can
/// target the data task that renders the subform rather than the subformPdf service task itself.
/// </summary>
internal static class SubformParentTaskResolver
{
    /// <summary>
    /// Finds the id of the first process task whose UI folder layout contains a component of type
    /// <c>Subform</c> with the given id. Tasks are checked in the order <paramref name="processReader"/>
    /// returns them (BPMN order) when it is available; otherwise the folders known to
    /// <paramref name="resources"/> are checked in their own order.
    /// </summary>
    /// <exception cref="ApplicationConfigException">
    /// No UI folder contains a Subform component with the given id.
    /// </exception>
    internal static string Resolve(string subformComponentId, IProcessReader? processReader, IAppResources resources)
    {
        UiConfiguration? uiConfiguration = resources.GetUiConfiguration();
        if (uiConfiguration is null)
        {
            throw NotFoundException(subformComponentId);
        }

        IEnumerable<string> folderIds = processReader is not null
            ? processReader.GetProcessTasks().Select(task => task.Id).Where(uiConfiguration.Folders.ContainsKey)
            : uiConfiguration.Folders.Keys;

        foreach (string folderId in folderIds)
        {
            if (FolderContainsSubformComponent(resources, folderId, subformComponentId))
            {
                return folderId;
            }
        }

        throw NotFoundException(subformComponentId);
    }

    private static bool FolderContainsSubformComponent(
        IAppResources resources,
        string folderId,
        string subformComponentId
    )
    {
        string layoutsJson = resources.GetLayoutsInFolder(folderId);
        using JsonDocument document = JsonDocument.Parse(layoutsJson);

        foreach (JsonProperty page in document.RootElement.EnumerateObject())
        {
            if (
                !page.Value.TryGetProperty("data", out JsonElement data)
                || !data.TryGetProperty("layout", out JsonElement layout)
                || layout.ValueKind != JsonValueKind.Array
            )
            {
                continue;
            }

            foreach (JsonElement component in layout.EnumerateArray())
            {
                if (
                    component.TryGetProperty("type", out JsonElement type)
                    && type.ValueEquals("Subform")
                    && component.TryGetProperty("id", out JsonElement id)
                    && id.ValueEquals(subformComponentId)
                )
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static ApplicationConfigException NotFoundException(string subformComponentId) =>
        new($"No task's UI layout contains a Subform component with id '{subformComponentId}'.");
}
