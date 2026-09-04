using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Locates and modifies components in layout documents owned by a migration workspace.
/// </summary>
internal sealed class LayoutFileManager
{
    private readonly Dictionary<string, LayoutMigrationWorkspace.LayoutDocument> _layoutFiles;

    public LayoutFileManager(LayoutMigrationWorkspace workspace, string layoutsDirectory)
    {
        _layoutFiles = workspace
            .DocumentsIn(layoutsDirectory)
            .ToDictionary(document => Path.GetFileName(document.FilePath), StringComparer.Ordinal);
    }

    /// <summary>
    /// Find a component by ID across all loaded layouts
    /// </summary>
    /// <returns>Tuple of (layout filename, component node) or null if not found</returns>
    public (string LayoutFile, JsonNode Component)? FindComponentById(string componentId)
    {
        foreach (var layoutEntry in _layoutFiles)
        {
            var rootNode = layoutEntry.Value.Root;

            // Navigate to data.layout array
            var dataNode = rootNode["data"];
            if (dataNode == null)
                continue;

            var layoutArray = dataNode["layout"]?.AsArray();
            if (layoutArray == null)
                continue;

            // Search for component with matching id
            foreach (var component in layoutArray)
            {
                if (component == null)
                    continue;

                var idNode = component["id"];
                if (idNode == null)
                    continue;

                var id = idNode.GetValue<string>();
                if (id == componentId)
                {
                    return (layoutEntry.Key, component);
                }
            }
        }

        return null;
    }

    /// <summary>
    /// Update or add a property on a component
    /// </summary>
    public void UpdateComponentProperty(JsonNode component, string propertyName, JsonNode value)
    {
        component.AsObject()[propertyName] = value;

        // Mark the file containing this component as modified
        MarkComponentFileAsModified(component);
    }

    /// <summary>
    /// Find which layout file contains the given component and mark it as modified
    /// </summary>
    private void MarkComponentFileAsModified(JsonNode component)
    {
        foreach (var layoutEntry in _layoutFiles)
        {
            var rootNode = layoutEntry.Value.Root;

            // Navigate to data.layout array
            var dataNode = rootNode["data"];
            if (dataNode == null)
                continue;

            var layoutArray = dataNode["layout"]?.AsArray();
            if (layoutArray == null)
                continue;

            // Check if this component is in this layout
            foreach (var comp in layoutArray)
            {
                if (comp == component)
                {
                    layoutEntry.Value.MarkModified();
                    return;
                }
            }
        }
    }

    /// <summary>
    /// Check if a component has a specific property
    /// </summary>
    public bool HasProperty(JsonNode component, string propertyName)
    {
        return component[propertyName] != null;
    }
}
