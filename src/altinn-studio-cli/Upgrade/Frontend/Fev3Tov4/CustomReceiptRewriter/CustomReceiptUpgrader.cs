using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.CustomReceiptRewriter;

/// <summary>
/// Moves receiptLayout into its own layout set.
/// Must be run after LayoutSetUpgrader
/// </summary>
class CustomReceiptUpgrader
{
    private readonly IList<string> warnings = new List<string>();
    private readonly string uiFolder;
    private readonly string receiptLayoutSetName;
    private string? receiptLayoutName;
    private string? receiptLayoutPath;

    private JsonNode? layoutSets;
    private Dictionary<string, JsonNode> settingsCollection = new Dictionary<string, JsonNode>();

    public CustomReceiptUpgrader(string uiFolder, string receiptLayoutSetName)
    {
        this.uiFolder = uiFolder;
        this.receiptLayoutSetName = receiptLayoutSetName;
    }

    public IList<string> GetWarnings()
    {
        return warnings;
    }

    public void Upgrade()
    {
        string? oldLayoutSetId = null;
        var layoutSets = Directory.GetDirectories(uiFolder);
        foreach (var layoutSet in layoutSets)
        {
            var settingsFileName = Path.Combine(layoutSet, "Settings.json");
            if (File.Exists(settingsFileName))
            {
                // Try to find a receiptLayout in settings
                var settingsNode = JsonNode.Parse(File.ReadAllText(settingsFileName));
                if (
                    settingsNode is JsonObject settingsObject
                    && settingsObject.TryGetPropertyValue("receiptLayoutName", out var receiptLayoutNameNode)
                    && receiptLayoutNameNode is JsonValue receiptLayoutNameValue
                )
                {
                    // Use the first receiptLayout found, and make sure to remove all others as well
                    if (string.IsNullOrEmpty(receiptLayoutName))
                    {
                        receiptLayoutName = receiptLayoutNameValue.GetValue<string>();
                        oldLayoutSetId = Path.GetFileName(layoutSet);
                        receiptLayoutPath = Path.Combine(layoutSet, "layouts", $"{receiptLayoutName}.json");
                    } else {
                        var compactSettingsFilePath = string.Join(Path.DirectorySeparatorChar, settingsFileName.Split(Path.DirectorySeparatorChar)[^2..]);
                        var compactReceiptFilePath = string.Join(Path.DirectorySeparatorChar, receiptLayoutPath!.Split(Path.DirectorySeparatorChar)[^3..]);
                        warnings.Add($"Found additional receiptLayoutName in {compactSettingsFilePath}. Currently using {compactReceiptFilePath}.");
                    }
                    settingsObject.Remove("receiptLayoutName");
                    settingsCollection.Add(settingsFileName, settingsNode);
                }
            }
        }

        if (string.IsNullOrEmpty(receiptLayoutName))
        {
            return;
        }

        if (!File.Exists(receiptLayoutPath))
        {
            var compactReceiptFilePath = string.Join(Path.DirectorySeparatorChar, receiptLayoutPath!.Split(Path.DirectorySeparatorChar)[^3..]);
            warnings.Add($"Receipt layout file {compactReceiptFilePath} does not exist, skipping upgrade.");
            return;
        }

        // Add new layout-set for receiptLayout
        var layoutSetsNode = JsonNode.Parse(File.ReadAllText(Path.Combine(uiFolder, "layout-sets.json")));
        if (layoutSetsNode is JsonObject layoutSetsObject)
        {
          layoutSetsObject.TryGetPropertyValue("sets", out var setsNode);

          if (setsNode is not JsonArray setsArray)
          {
            warnings.Add("layout-sets.json is missing 'sets' array");
            return;
          }

          // Find out what dataType to use
          string? dataType = null;
          foreach (var setNode in setsArray)
          {
            if (
                setNode is JsonObject setObject 
                && setObject.TryGetPropertyValue("id", out var idNode) 
                && idNode is JsonValue idValue 
                && idValue.GetValue<string>() == oldLayoutSetId
            )
            {
              setObject.TryGetPropertyValue("dataType", out var dataTypeNode);
              if (dataTypeNode is JsonValue dataTypeValue) {
                dataType = dataTypeValue.GetValue<string>();
                break;
              }
            }
          }

          if (dataType == null) {
            warnings.Add("Could not find dataType for custom receipt, skipping upgrade.");
            return;
          }

          setsArray.Add(JsonNode.Parse($@"{{""id"": ""{receiptLayoutSetName}"", ""dataType"": ""{dataType}"", ""tasks"": [""CustomReceipt""]}}"));

          this.layoutSets = layoutSetsObject;
        } else {
          warnings.Add("layout-sets.json is not a valid JSON object");
        } 
    }

    public async Task Write()
    {
        if (receiptLayoutName != null && layoutSets != null && receiptLayoutPath != null)
        {
            JsonSerializerOptions options = new JsonSerializerOptions
            {
                WriteIndented = true,
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            };

            // Write new settings files
            await Task.WhenAll(
                settingsCollection.Select(async settingsTuple =>
                {
                    settingsTuple.Deconstruct(out var filePath, out var settingsJson);

                    var settingsText = settingsJson.ToJsonString(options);
                    await File.WriteAllTextAsync(filePath, settingsText);
                })
            );

            // Overwrite layout-sets
            var layoutSetsText = layoutSets.ToJsonString(options);
            await File.WriteAllTextAsync(Path.Combine(uiFolder, "layout-sets.json"), layoutSetsText);

            // Move receiptLayout to its own layout-set
            Directory.CreateDirectory(Path.Combine(uiFolder, receiptLayoutSetName, "layouts"));
            File.Move(receiptLayoutPath, Path.Combine(uiFolder, receiptLayoutSetName, "layouts", $"{receiptLayoutName}.json"));
        }
    }
}
