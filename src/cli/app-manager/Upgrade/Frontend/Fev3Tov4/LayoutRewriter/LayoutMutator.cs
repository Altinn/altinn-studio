using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter;

/// <summary>
/// Reads all layout files and applies a set of mutators to them before writing them back
/// This class requires that the app has already been converted to using layout sets
/// </summary>
internal sealed class LayoutMutator
{
    private readonly IList<string> _warnings = new List<string>();
    private readonly Dictionary<string, JsonObject> _layoutCollection = new();
    private readonly string _uiFolder;

    public LayoutMutator(string uiFolder)
    {
        _uiFolder = uiFolder;
    }

    public IList<string> GetWarnings()
    {
        return _warnings;
    }

    public void ReadAllLayoutFiles()
    {
        var layoutSets = Directory.GetDirectories(_uiFolder);
        foreach (var layoutSet in layoutSets)
        {
            var layoutsFolder = Path.Combine(layoutSet, "layouts");
            if (!Directory.Exists(layoutsFolder))
            {
                var compactLayoutsPath = string.Join(
                    Path.DirectorySeparatorChar,
                    layoutSet.Split(Path.DirectorySeparatorChar)[^2..]
                );
                _warnings.Add($"No layouts folder found in layoutset {compactLayoutsPath}, skipping");
                continue;
            }

            var layoutFiles = Directory.GetFiles(layoutsFolder, "*.json");
            foreach (var layoutFile in layoutFiles)
            {
                var layoutText = File.ReadAllText(layoutFile);
                var layoutJson = JsonNode.Parse(
                    layoutText,
                    null,
                    new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
                );

                if (layoutJson is not JsonObject layoutJsonObject)
                {
                    var compactLayoutFilePath = string.Join(
                        Path.DirectorySeparatorChar,
                        layoutFile.Split(Path.DirectorySeparatorChar)[^3..]
                    );
                    _warnings.Add($"Unable to parse {compactLayoutFilePath} as a json object, skipping");
                    continue;
                }

                _layoutCollection.Add(layoutFile, layoutJsonObject);
            }
        }
    }

    public void Mutate(ILayoutMutator mutator)
    {
        foreach ((var filePath, var layoutJson) in _layoutCollection)
        {
            var compactFilePath = string.Join(
                Path.DirectorySeparatorChar,
                filePath.Split(Path.DirectorySeparatorChar)[^3..]
            );
            var components = new List<JsonObject>();
            var componentLookup = new Dictionary<string, JsonObject>();

            layoutJson.TryGetPropertyValue("data", out var dataNode);
            if (dataNode is not JsonObject dataObject)
            {
                _warnings.Add($"Unable to parse data node in {compactFilePath}, expected an object");
                continue;
            }

            JsonNode? layoutNode;
            try
            {
                dataObject.TryGetPropertyValue("layout", out layoutNode);
            }
            catch (Exception e)
            {
                // Duplicate keys in the object will throw an exception here
                _warnings.Add($"Unable to parse layout array in {compactFilePath}, error: {e.Message}");
                continue;
            }

            if (layoutNode is not JsonArray layoutArray)
            {
                _warnings.Add($"Unable to parse layout node in {compactFilePath}, expected an array");
                continue;
            }

            foreach (var componentNode in layoutArray)
            {
                if (componentNode is not JsonObject componentObject)
                {
                    _warnings.Add(
                        $"Unable to parse component {componentNode?.ToJsonString()} in {compactFilePath}, expected an object"
                    );
                    continue;
                }

                JsonNode? idNode;
                try
                {
                    componentObject.TryGetPropertyValue("id", out idNode);
                }
                catch (Exception e)
                {
                    // Duplicate keys in the object will throw an exception here
                    _warnings.Add(
                        $"Unable to parse component {componentNode?.ToJsonString()} in {compactFilePath}, error: {e.Message}"
                    );
                    continue;
                }

                if (idNode is not JsonValue idValue || idValue.GetValueKind() != JsonValueKind.String)
                {
                    _warnings.Add(
                        $"Unable to parse id {idNode?.ToJsonString()} in {compactFilePath}, expected a string"
                    );
                    continue;
                }

                var id = idValue.GetValue<string>();

                if (componentLookup.ContainsKey(id))
                {
                    _warnings.Add($"Duplicate id {id} in {compactFilePath}, skipping upgrade of component");
                    continue;
                }

                components.Add(componentObject);
                componentLookup.Add(id, componentObject);
            }

            foreach (var component in components)
            {
                var result = mutator.Mutate(component.DeepClone().AsObject(), componentLookup);
                if (result is SkipResult)
                {
                    continue;
                }

                if (result is ErrorResult errorResult)
                {
                    _warnings.Add(
                        $"Updating component {component["id"]} in {compactFilePath} failed with the message: {errorResult.Message}"
                    );
                    continue;
                }

                if (result is DeleteResult deleteResult)
                {
                    if (deleteResult.Warnings.Count > 0)
                    {
                        _warnings.Add(
                            $"Updating component {component["id"]} in {compactFilePath} resulted in the following warnings: {string.Join(", ", deleteResult.Warnings)}"
                        );
                    }
                    layoutArray.Remove(component);
                    continue;
                }

                if (result is ReplaceResult replaceResult)
                {
                    if (replaceResult.Warnings.Count > 0)
                    {
                        _warnings.Add(
                            $"Updating component {component["id"]} in {compactFilePath} resulted in the following warnings: {string.Join(", ", replaceResult.Warnings)}"
                        );
                    }
                    var index = layoutArray.IndexOf(component);
                    layoutArray.RemoveAt(index);
                    layoutArray.Insert(index, replaceResult.Component);
                    continue;
                }
            }
        }
    }

    public async Task WriteAllLayoutFiles()
    {
        JsonSerializerOptions options = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };

        await Task.WhenAll(
            _layoutCollection.Select(async layoutTuple =>
            {
                layoutTuple.Deconstruct(out var filePath, out var layoutJson);

                var layoutText = layoutJson.ToJsonString(options);
                await File.WriteAllTextAsync(filePath, layoutText);
            })
        );
    }
}
