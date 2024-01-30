using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace altinn_app_cli.fev3tov4.SchemaRefRewriter;

/// <summary>
/// Upgrades schema refs
/// Assumes that layout set conversion has already been done
/// </summary>
class SchemaRefUpgrader
{
    private readonly IList<string> warnings = new List<string>();
    private Dictionary<string, JsonObject> files = new Dictionary<string, JsonObject>();
    private readonly string uiFolder;
    private readonly string applicationMetadataFile;
    private readonly string textsFolder;
    private readonly string layoutSchemaUri;
    private readonly string layoutSetsSchemaUri;
    private readonly string layoutSettingsSchemaUri;
    private readonly string footerSchemaUri;
    private readonly string applicationMetadataSchemaUri;
    private readonly string textResourcesSchemaUri;

    public SchemaRefUpgrader(
        string targetVersion,
        string uiFolder,
        string applicationMetadataFile,
        string textsFolder
    )
    {
        this.uiFolder = uiFolder;
        this.applicationMetadataFile = applicationMetadataFile;
        this.textsFolder = textsFolder;

        this.layoutSchemaUri = $"https://altinncdn.no/toolkits/altinn-app-frontend/{targetVersion}/schemas/json/layout/layout.schema.v1.json";
        this.layoutSetsSchemaUri = $"https://altinncdn.no/toolkits/altinn-app-frontend/{targetVersion}/schemas/json/layout/layout-sets.schema.v1.json";
        this.layoutSettingsSchemaUri = $"https://altinncdn.no/toolkits/altinn-app-frontend/{targetVersion}/schemas/json/layout/layoutSettings.schema.v1.json";
        this.footerSchemaUri = $"https://altinncdn.no/toolkits/altinn-app-frontend/{targetVersion}/schemas/json/layout/footer.schema.v1.json";
        this.applicationMetadataSchemaUri = $"https://altinncdn.no/toolkits/altinn-app-frontend/{targetVersion}/schemas/json/application/application-metadata.schema.v1.json";
        this.textResourcesSchemaUri = $"https://altinncdn.no/toolkits/altinn-app-frontend/{targetVersion}/schemas/json/text-resources/text-resources.schema.v1.json";
    }

    public IList<string> GetWarnings()
    {
        return warnings;
    }

    public void Upgrade() 
    {
        // Application metadata
        var appMetaJson = JsonNode.Parse(File.ReadAllText(applicationMetadataFile), null, new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
        if (appMetaJson is JsonObject appMetaJsonObject)
        {
            appMetaJsonObject["$schema"] = JsonValue.Create(applicationMetadataSchemaUri);
            this.files.Add(applicationMetadataFile, appMetaJsonObject);
        }
        else
        {
            warnings.Add("Unable to parse applicationmetadata.json, skipping schema ref upgrade");
        }

        // Text resources
        var textResourceFiles = Directory.GetFiles(textsFolder, "*.json");
        foreach (var textResourceFile in textResourceFiles)
        {
            var textResourceJson = JsonNode.Parse(File.ReadAllText(textResourceFile), null, new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
            if (textResourceJson is JsonObject textResourceJsonObject)
            {
                textResourceJsonObject["$schema"] = JsonValue.Create(textResourcesSchemaUri);
                this.files.Add(textResourceFile, textResourceJsonObject);
            }
            else
            {
                var compactFilePath = string.Join(Path.DirectorySeparatorChar, textResourceFile.Split(Path.DirectorySeparatorChar)[^2..]);
                warnings.Add($"Unable to parse {compactFilePath}, skipping schema ref upgrade");
            }
        }

        // Footer
        var footerFile = Path.Join(uiFolder, "footer.json");
        if (File.Exists(footerFile))
        {
            var footerJson = JsonNode.Parse(File.ReadAllText(footerFile), null, new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
            if (footerJson is JsonObject footerJsonObject)
            {
                footerJsonObject["$schema"] = JsonValue.Create(footerSchemaUri);
                this.files.Add(footerFile, footerJsonObject);
            }
            else
            {
                warnings.Add("Unable to parse footer.json, skipping schema ref upgrade");
            }
        }

        // Layout sets
        var layoutSetsFile = Path.Combine(uiFolder, "layout-sets.json");
        var layoutSetsJson = JsonNode.Parse(File.ReadAllText(layoutSetsFile), null, new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
        if (layoutSetsJson is JsonObject layoutSetsJsonObject)
        {
            layoutSetsJsonObject["$schema"] = JsonValue.Create(layoutSetsSchemaUri);
            this.files.Add(layoutSetsFile, layoutSetsJsonObject);
        }
        else
        {
            warnings.Add("Unable to parse layout-sets.json, skipping schema ref upgrade");
        }

        // Layouts and layout settings
        var layoutSets = Directory.GetDirectories(uiFolder);
        foreach (var layoutSet in layoutSets)
        {
            // Layout settings
            var layoutSettingsFile = Path.Join(layoutSet, "Settings.json");
            var compactSettingsFilePath = string.Join(Path.DirectorySeparatorChar, layoutSettingsFile.Split(Path.DirectorySeparatorChar)[^2..]);
            if (File.Exists(layoutSettingsFile)) {
                var layoutSettingsJson = JsonNode.Parse(File.ReadAllText(layoutSettingsFile), null, new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
                if (layoutSettingsJson is JsonObject layoutSettingsJsonObject)
                {
                    layoutSettingsJsonObject["$schema"] = JsonValue.Create(layoutSettingsSchemaUri);
                    this.files.Add(layoutSettingsFile, layoutSettingsJsonObject);
                }
                else
                {
                    warnings.Add($"Unable to parse {compactSettingsFilePath}, skipping schema ref upgrade");
                }
            } 
            else 
            {
                warnings.Add($"Could not find {compactSettingsFilePath}, skipping schema ref upgrade");
            }

            // Layout files
            var layoutFiles = Directory.GetFiles(Path.Join(layoutSet, "layouts"), "*.json");
            foreach (var layoutFile in layoutFiles)
            {
                var layoutJson = JsonNode.Parse(File.ReadAllText(layoutFile), null, new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
                if (layoutJson is JsonObject layoutJsonObject)
                {
                    layoutJsonObject["$schema"] = JsonValue.Create(layoutSchemaUri);
                    this.files.Add(layoutFile, layoutJsonObject);
                }
                else
                {
                    var compactLayoutFilePath = string.Join(Path.DirectorySeparatorChar, layoutFile.Split(Path.DirectorySeparatorChar)[^3..]);
                    warnings.Add($"Unable to parse {compactLayoutFilePath}, skipping schema ref upgrade");
                }
            }
        }

    }

    public async Task Write()
    {
        JsonSerializerOptions options = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };

        await Task.WhenAll(
            files.Select(async fileTuple =>
            {
                fileTuple.Deconstruct(out var filePath, out var json);

                var layoutText = json.ToJsonString(options);
                await File.WriteAllTextAsync(filePath, layoutText);
            })
        );
    }
}
