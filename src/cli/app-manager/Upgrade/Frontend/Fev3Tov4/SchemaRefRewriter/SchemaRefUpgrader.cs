using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.SchemaRefRewriter;

/// <summary>
/// Upgrades schema refs
/// Assumes that layout set conversion has already been done
/// </summary>
internal sealed class SchemaRefUpgrader
{
    private readonly IList<string> _warnings = new List<string>();
    private readonly Dictionary<string, JsonObject> _files = new();
    private readonly string _uiFolder;
    private readonly string _applicationMetadataFile;
    private readonly string _textsFolder;
    private readonly string _layoutSchemaUri;
    private readonly string _layoutSetsSchemaUri;
    private readonly string _layoutSettingsSchemaUri;
    private readonly string _footerSchemaUri;
    private readonly string _applicationMetadataSchemaUri;
    private readonly string _textResourcesSchemaUri;

    public SchemaRefUpgrader(string targetVersion, string uiFolder, string applicationMetadataFile, string textsFolder)
    {
        _uiFolder = uiFolder;
        _applicationMetadataFile = applicationMetadataFile;
        _textsFolder = textsFolder;

        _layoutSchemaUri =
            $"https://altinncdn.no/toolkits/altinn-app-frontend/{targetVersion}/schemas/json/layout/layout.schema.v1.json";
        _layoutSetsSchemaUri =
            $"https://altinncdn.no/toolkits/altinn-app-frontend/{targetVersion}/schemas/json/layout/layout-sets.schema.v1.json";
        _layoutSettingsSchemaUri =
            $"https://altinncdn.no/toolkits/altinn-app-frontend/{targetVersion}/schemas/json/layout/layoutSettings.schema.v1.json";
        _footerSchemaUri =
            $"https://altinncdn.no/toolkits/altinn-app-frontend/{targetVersion}/schemas/json/layout/footer.schema.v1.json";
        _applicationMetadataSchemaUri =
            $"https://altinncdn.no/toolkits/altinn-app-frontend/{targetVersion}/schemas/json/application/application-metadata.schema.v1.json";
        _textResourcesSchemaUri =
            $"https://altinncdn.no/toolkits/altinn-app-frontend/{targetVersion}/schemas/json/text-resources/text-resources.schema.v1.json";
    }

    public IList<string> GetWarnings()
    {
        return _warnings;
    }

    public void Upgrade()
    {
        // Application metadata
        var appMetaJson = JsonNode.Parse(
            File.ReadAllText(_applicationMetadataFile),
            null,
            new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
        );
        if (appMetaJson is JsonObject appMetaJsonObject)
        {
            _files.Add(_applicationMetadataFile, WithSchemaRef(appMetaJsonObject, _applicationMetadataSchemaUri));
        }
        else
        {
            _warnings.Add("Unable to parse applicationmetadata.json, skipping schema ref upgrade");
        }

        // Text resources
        var textResourceFiles = Directory.GetFiles(_textsFolder, "*.json");
        foreach (var textResourceFile in textResourceFiles)
        {
            var textResourceJson = JsonNode.Parse(
                File.ReadAllText(textResourceFile),
                null,
                new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
            );
            if (textResourceJson is JsonObject textResourceJsonObject)
            {
                _files.Add(textResourceFile, WithSchemaRef(textResourceJsonObject, _textResourcesSchemaUri));
            }
            else
            {
                var compactFilePath = string.Join(
                    Path.DirectorySeparatorChar,
                    textResourceFile.Split(Path.DirectorySeparatorChar)[^2..]
                );
                _warnings.Add($"Unable to parse {compactFilePath}, skipping schema ref upgrade");
            }
        }

        // Footer
        var footerFile = Path.Combine(_uiFolder, "footer.json");
        if (File.Exists(footerFile))
        {
            var footerJson = JsonNode.Parse(
                File.ReadAllText(footerFile),
                null,
                new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
            );
            if (footerJson is JsonObject footerJsonObject)
            {
                _files.Add(footerFile, WithSchemaRef(footerJsonObject, _footerSchemaUri));
            }
            else
            {
                _warnings.Add("Unable to parse footer.json, skipping schema ref upgrade");
            }
        }

        // Layout sets
        var layoutSetsFile = Path.Combine(_uiFolder, "layout-sets.json");
        var layoutSetsJson = JsonNode.Parse(
            File.ReadAllText(layoutSetsFile),
            null,
            new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
        );
        if (layoutSetsJson is JsonObject layoutSetsJsonObject)
        {
            _files.Add(layoutSetsFile, WithSchemaRef(layoutSetsJsonObject, _layoutSetsSchemaUri));
        }
        else
        {
            _warnings.Add("Unable to parse layout-sets.json, skipping schema ref upgrade");
        }

        // Layouts and layout settings
        var layoutSets = Directory.GetDirectories(_uiFolder);
        foreach (var layoutSet in layoutSets)
        {
            // Layout settings
            var layoutSettingsFile = Path.Combine(layoutSet, "Settings.json");
            var compactSettingsFilePath = string.Join(
                Path.DirectorySeparatorChar,
                layoutSettingsFile.Split(Path.DirectorySeparatorChar)[^2..]
            );
            if (File.Exists(layoutSettingsFile))
            {
                var layoutSettingsJson = JsonNode.Parse(
                    File.ReadAllText(layoutSettingsFile),
                    null,
                    new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
                );
                if (layoutSettingsJson is JsonObject layoutSettingsJsonObject)
                {
                    _files.Add(layoutSettingsFile, WithSchemaRef(layoutSettingsJsonObject, _layoutSettingsSchemaUri));
                }
                else
                {
                    _warnings.Add($"Unable to parse {compactSettingsFilePath}, skipping schema ref upgrade");
                }
            }
            else
            {
                _warnings.Add($"Could not find {compactSettingsFilePath}, skipping schema ref upgrade");
            }

            // Layout files
            var layoutsFolder = Path.Combine(layoutSet, "layouts");
            if (Directory.Exists(layoutsFolder))
            {
                var layoutFiles = Directory.GetFiles(layoutsFolder, "*.json");
                foreach (var layoutFile in layoutFiles)
                {
                    var layoutJson = JsonNode.Parse(
                        File.ReadAllText(layoutFile),
                        null,
                        new JsonDocumentOptions()
                        {
                            CommentHandling = JsonCommentHandling.Skip,
                            AllowTrailingCommas = true,
                        }
                    );
                    if (layoutJson is JsonObject layoutJsonObject)
                    {
                        _files.Add(layoutFile, WithSchemaRef(layoutJsonObject, _layoutSchemaUri));
                    }
                    else
                    {
                        var compactLayoutFilePath = string.Join(
                            Path.DirectorySeparatorChar,
                            layoutFile.Split(Path.DirectorySeparatorChar)[^3..]
                        );
                        _warnings.Add($"Unable to parse {compactLayoutFilePath}, skipping schema ref upgrade");
                    }
                }
            }
            else
            {
                var compactLayoutsPath = string.Join(
                    Path.DirectorySeparatorChar,
                    layoutSet.Split(Path.DirectorySeparatorChar)[^2..]
                );
                _warnings.Add($"No layouts folder found in layoutset {compactLayoutsPath}, skipping");
            }
        }
    }

    public JsonObject WithSchemaRef(JsonObject json, string schemaUrl)
    {
        json.Remove("$schema");

        var schemaProperty = new KeyValuePair<string, JsonNode?>("$schema", JsonValue.Create(schemaUrl));

        return new JsonObject(
            json.AsEnumerable()
                .Select(n => KeyValuePair.Create<string, JsonNode?>(n.Key, n.Value?.DeepClone()))
                .Prepend(schemaProperty)
        );
    }

    public async Task Write()
    {
        JsonSerializerOptions options = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };

        await Task.WhenAll(
            _files.Select(async fileTuple =>
            {
                fileTuple.Deconstruct(out var filePath, out var json);

                var layoutText = json.ToJsonString(options);
                await File.WriteAllTextAsync(filePath, layoutText);
            })
        );
    }
}
