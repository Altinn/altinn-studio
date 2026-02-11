using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Manages reading, modifying, and writing layout JSON files
/// </summary>
internal sealed class LayoutFileManager
{
    private readonly string _layoutsDirectory;
    private readonly Dictionary<string, (string FilePath, JsonNode RootNode)> _layoutFiles;
    private readonly HashSet<string> _modifiedFiles;
    private readonly JsonSerializerOptions _jsonOptions;

    public LayoutFileManager(string layoutsDirectory)
    {
        _layoutsDirectory = layoutsDirectory;
        _layoutFiles = new Dictionary<string, (string, JsonNode)>();
        _modifiedFiles = new HashSet<string>();
        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };
    }

    /// <summary>
    /// Load all layout JSON files from the directory
    /// </summary>
    public void LoadLayouts()
    {
        if (!Directory.Exists(_layoutsDirectory))
        {
            throw new DirectoryNotFoundException($"Layouts directory not found: {_layoutsDirectory}");
        }

        var jsonFiles = Directory.GetFiles(_layoutsDirectory, "*.json");
        foreach (var filePath in jsonFiles)
        {
            try
            {
                var jsonText = File.ReadAllText(filePath);
                var jsonNode = JsonNode.Parse(
                    jsonText,
                    new JsonNodeOptions { PropertyNameCaseInsensitive = false },
                    new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
                );
                if (jsonNode != null)
                {
                    var fileName = Path.GetFileName(filePath);
                    _layoutFiles[fileName] = (filePath, jsonNode);
                }
            }
            catch (JsonException ex)
            {
                throw new InvalidOperationException($"Failed to parse layout file {filePath}: {ex.Message}", ex);
            }
        }
    }

    /// <summary>
    /// Find a component by ID across all loaded layouts
    /// </summary>
    /// <returns>Tuple of (layout filename, component node) or null if not found</returns>
    public (string LayoutFile, JsonNode Component)? FindComponentById(string componentId)
    {
        foreach (var layoutEntry in _layoutFiles)
        {
            var layoutFile = layoutEntry.Key;
            var (_, rootNode) = layoutEntry.Value;

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
                    return (layoutFile, component);
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
            var layoutFile = layoutEntry.Key;
            var (_, rootNode) = layoutEntry.Value;

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
                    _modifiedFiles.Add(layoutFile);
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

    /// <summary>
    /// Save all modified layouts back to disk
    /// </summary>
    public void SaveLayouts()
    {
        foreach (var layoutEntry in _layoutFiles)
        {
            var layoutFile = layoutEntry.Key;

            // Only save files that were actually modified
            if (!_modifiedFiles.Contains(layoutFile))
                continue;

            var (filePath, rootNode) = layoutEntry.Value;
            var jsonText = rootNode.ToJsonString(_jsonOptions);
            File.WriteAllText(filePath, jsonText);
        }
    }
}
