using System.Text.Json;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Resolves subform PDF configuration to the UI folder that renders its data. The layout index is
/// created once per scope, so generating several subform PDFs does not reload layouts for each element.
/// </summary>
internal sealed class SubformPdfTargetResolver
{
    private readonly IAppResources _resources;
    private readonly Lazy<Dictionary<(string ComponentId, string DataType), string[]>> _folders;

    public SubformPdfTargetResolver(IAppResources resources)
    {
        _resources = resources;
        _folders = new(BuildFolderIndex);
    }

    /// <summary>
    /// Resolves a subform component and data element to a complete render target. References from
    /// several tasks to the same subform folder are equivalent; distinct matching folders are ambiguous.
    /// </summary>
    public SubformPdfRenderTarget Resolve(string componentId, DataElement dataElement)
    {
        if (!_folders.Value.TryGetValue((componentId, dataElement.DataType), out string[]? folders))
        {
            throw new ApplicationConfigException(
                $"No Subform component with id '{componentId}' references a UI folder for data type '{dataElement.DataType}'."
            );
        }

        if (folders.Length != 1)
        {
            throw new ApplicationConfigException(
                $"Subform component id '{componentId}' for data type '{dataElement.DataType}' references several UI folders: {string.Join(", ", folders)}. Use distinct component ids to identify the intended subform folder."
            );
        }

        return new SubformPdfRenderTarget(folders[0], dataElement.DataType, dataElement.Id);
    }

    private Dictionary<(string ComponentId, string DataType), string[]> BuildFolderIndex()
    {
        UiConfiguration? ui = _resources.GetUiConfiguration();
        if (ui is null)
        {
            return [];
        }

        Dictionary<(string ComponentId, string DataType), HashSet<string>> folders = [];
        foreach (string folderId in ui.Folders.Keys)
        {
            using JsonDocument layouts = JsonDocument.Parse(_resources.GetLayoutsInFolder(folderId));
            foreach (JsonProperty page in layouts.RootElement.EnumerateObject())
            {
                PageComponent parsedPage = PageComponent.Parse(page.Value, page.Name, folderId);
                foreach (SubFormComponent component in parsedPage.AllComponents.OfType<SubFormComponent>())
                {
                    if (
                        !ui.Folders.TryGetValue(component.LayoutSetId, out LayoutSettings? settings)
                        || settings.DefaultDataType is not { } dataType
                    )
                    {
                        continue;
                    }

                    var key = (component.Id, dataType);
                    if (!folders.TryGetValue(key, out HashSet<string>? matches))
                    {
                        matches = new(StringComparer.Ordinal);
                        folders.Add(key, matches);
                    }

                    matches.Add(component.LayoutSetId);
                }
            }
        }

        return folders.ToDictionary(entry => entry.Key, entry => entry.Value.Order(StringComparer.Ordinal).ToArray());
    }
}
