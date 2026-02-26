using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.CustomReceiptRewriter;

/// <summary>
/// Moves receiptLayout into its own layout set.
/// Must be run after LayoutSetUpgrader
/// </summary>
internal sealed class CustomReceiptUpgrader
{
    private readonly IList<string> _warnings = new List<string>();
    private readonly string _uiFolder;
    private readonly string _receiptLayoutSetName;
    private string? _receiptLayoutName;
    private string? _receiptLayoutPath;

    private JsonNode? _layoutSets;
    private readonly Dictionary<string, JsonNode> _settingsCollection = new();

    public CustomReceiptUpgrader(string uiFolder, string receiptLayoutSetName)
    {
        _uiFolder = uiFolder;
        _receiptLayoutSetName = receiptLayoutSetName;
    }

    public IList<string> GetWarnings()
    {
        return _warnings;
    }

    public void Upgrade()
    {
        string? oldLayoutSetId = null;
        var layoutSetDirectories = Directory.GetDirectories(_uiFolder);
        foreach (var layoutSet in layoutSetDirectories)
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
                    if (string.IsNullOrEmpty(_receiptLayoutName))
                    {
                        _receiptLayoutName = receiptLayoutNameValue.GetValue<string>();
                        oldLayoutSetId = Path.GetFileName(layoutSet);
                        _receiptLayoutPath = Path.Combine(layoutSet, "layouts", $"{_receiptLayoutName}.json");
                    }
                    else
                    {
                        var compactSettingsFilePath = string.Join(
                            Path.DirectorySeparatorChar,
                            settingsFileName.Split(Path.DirectorySeparatorChar)[^2..]
                        );
                        if (_receiptLayoutPath is null)
                            throw new InvalidOperationException("Receipt layout path is unexpectedly null");
                        var compactReceiptFilePath = string.Join(
                            Path.DirectorySeparatorChar,
                            _receiptLayoutPath.Split(Path.DirectorySeparatorChar)[^3..]
                        );
                        _warnings.Add(
                            $"Found additional receiptLayoutName in {compactSettingsFilePath}. Currently using {compactReceiptFilePath}."
                        );
                    }
                    settingsObject.Remove("receiptLayoutName");
                    _settingsCollection.Add(settingsFileName, settingsNode);
                }
            }
        }

        if (string.IsNullOrEmpty(_receiptLayoutName))
        {
            return;
        }

        if (!File.Exists(_receiptLayoutPath))
        {
            if (_receiptLayoutPath is null)
                throw new InvalidOperationException("Receipt layout path is unexpectedly null");
            var compactReceiptFilePath = string.Join(
                Path.DirectorySeparatorChar,
                _receiptLayoutPath.Split(Path.DirectorySeparatorChar)[^3..]
            );
            _warnings.Add($"Receipt layout file {compactReceiptFilePath} does not exist, skipping upgrade.");
            return;
        }

        // Add new layout-set for receiptLayout
        var layoutSetsNode = JsonNode.Parse(File.ReadAllText(Path.Combine(_uiFolder, "layout-sets.json")));
        if (layoutSetsNode is JsonObject layoutSetsObject)
        {
            layoutSetsObject.TryGetPropertyValue("sets", out var setsNode);

            if (setsNode is not JsonArray setsArray)
            {
                _warnings.Add("layout-sets.json is missing 'sets' array");
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
                    if (dataTypeNode is JsonValue dataTypeValue)
                    {
                        dataType = dataTypeValue.GetValue<string>();
                        break;
                    }
                }
            }

            if (dataType is null)
            {
                _warnings.Add("Could not find dataType for custom receipt, skipping upgrade.");
                return;
            }

            setsArray.Add(
                JsonNode.Parse(
                    $@"{{""id"": ""{_receiptLayoutSetName}"", ""dataType"": ""{dataType}"", ""tasks"": [""CustomReceipt""]}}"
                )
            );

            _layoutSets = layoutSetsObject;
        }
        else
        {
            _warnings.Add("layout-sets.json is not a valid JSON object");
        }
    }

    public async Task Write()
    {
        if (_receiptLayoutName is not null && _layoutSets is not null && _receiptLayoutPath is not null)
        {
            JsonSerializerOptions options = new JsonSerializerOptions
            {
                WriteIndented = true,
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            };

            // Write new settings files
            await Task.WhenAll(
                _settingsCollection.Select(async settingsTuple =>
                {
                    settingsTuple.Deconstruct(out var filePath, out var settingsJson);

                    var settingsText = settingsJson.ToJsonString(options);
                    await File.WriteAllTextAsync(filePath, settingsText);
                })
            );

            // Overwrite layout-sets
            var layoutSetsText = _layoutSets.ToJsonString(options);
            await File.WriteAllTextAsync(Path.Combine(_uiFolder, "layout-sets.json"), layoutSetsText);

            // Move receiptLayout to its own layout-set
            Directory.CreateDirectory(Path.Combine(_uiFolder, _receiptLayoutSetName, "layouts"));
            File.Move(
                _receiptLayoutPath,
                Path.Combine(_uiFolder, _receiptLayoutSetName, "layouts", $"{_receiptLayoutName}.json")
            );
        }
    }
}
