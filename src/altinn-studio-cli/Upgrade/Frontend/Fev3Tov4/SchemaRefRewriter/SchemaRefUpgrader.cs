using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.SchemaRefRewriter;

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
            this.files.Add(applicationMetadataFile, WithSchemaRef(appMetaJsonObject, applicationMetadataSchemaUri));
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
                this.files.Add(textResourceFile, WithSchemaRef(textResourceJsonObject, textResourcesSchemaUri));
            }
            else
            {
                var compactFilePath = string.Join(Path.DirectorySeparatorChar, textResourceFile.Split(Path.DirectorySeparatorChar)[^2..]);
                warnings.Add($"Unable to parse {compactFilePath}, skipping schema ref upgrade");
            }
        }

        // Footer
        var footerFile = Path.Combine(uiFolder, "footer.json");
        if (File.Exists(footerFile))
        {
            var footerJson = JsonNode.Parse(File.ReadAllText(footerFile), null, new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
            if (footerJson is JsonObject footerJsonObject)
            {
                this.files.Add(footerFile, WithSchemaRef(footerJsonObject, footerSchemaUri));
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
            this.files.Add(layoutSetsFile, WithSchemaRef(layoutSetsJsonObject, layoutSetsSchemaUri));
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
            var layoutSettingsFile = Path.Combine(layoutSet, "Settings.json");
            var compactSettingsFilePath = string.Join(Path.DirectorySeparatorChar, layoutSettingsFile.Split(Path.DirectorySeparatorChar)[^2..]);
            if (File.Exists(layoutSettingsFile)) {
                var layoutSettingsJson = JsonNode.Parse(File.ReadAllText(layoutSettingsFile), null, new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
                if (layoutSettingsJson is JsonObject layoutSettingsJsonObject)
                {
                    this.files.Add(layoutSettingsFile, WithSchemaRef(layoutSettingsJsonObject, layoutSettingsSchemaUri));
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
            var layoutsFolder = Path.Combine(layoutSet, "layouts");
            if (Directory.Exists(layoutsFolder))
            {
              var layoutFiles = Directory.GetFiles(layoutsFolder, "*.json");
              foreach (var layoutFile in layoutFiles)
              {
                  var layoutJson = JsonNode.Parse(File.ReadAllText(layoutFile), null, new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
                  if (layoutJson is JsonObject layoutJsonObject)
                  {
                      this.files.Add(layoutFile, WithSchemaRef(layoutJsonObject, layoutSchemaUri));
                  }
                  else
                  {
                      var compactLayoutFilePath = string.Join(Path.DirectorySeparatorChar, layoutFile.Split(Path.DirectorySeparatorChar)[^3..]);
                      warnings.Add($"Unable to parse {compactLayoutFilePath}, skipping schema ref upgrade");
                  }
              }
            } 
            else 
            {
              var compactLayoutsPath = string.Join(Path.DirectorySeparatorChar, layoutSet.Split(Path.DirectorySeparatorChar)[^2..]);
              warnings.Add($"No layouts folder found in layoutset {compactLayoutsPath}, skipping");
              continue;
            }
        }
    }

    public JsonObject WithSchemaRef(JsonObject json, string schemaUrl)
    {
        if (json.ContainsKey("$schema"))
        {
            json.Remove("$schema");
        }

        var schemaProperty = new KeyValuePair<string, JsonNode?>("$schema", JsonValue.Create(schemaUrl));

        return new JsonObject(json.AsEnumerable().Select(n => KeyValuePair.Create<string, JsonNode?>(n.Key, n.Value?.DeepClone())).Prepend(schemaProperty));
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
