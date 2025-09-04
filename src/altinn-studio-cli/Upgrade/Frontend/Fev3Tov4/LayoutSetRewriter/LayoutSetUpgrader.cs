using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutSetRewriter;

internal sealed class LayoutSetUpgrader
{
    private readonly IList<string> _warnings = new List<string>();
    private readonly string _uiFolder;
    private readonly string _layoutSetName;
    private readonly string _applicationMetadataFile;
    private JsonNode? _layoutSetsJson = null;

    public LayoutSetUpgrader(string uiFolder, string layoutSetName, string applicationMetadataFile)
    {
        _uiFolder = uiFolder;
        _layoutSetName = layoutSetName;
        _applicationMetadataFile = applicationMetadataFile;
    }

    public IList<string> GetWarnings()
    {
        return _warnings;
    }

    public void Upgrade()
    {
        // Read applicationmetadata.json file
        var appMetaText = File.ReadAllText(_applicationMetadataFile);
        var appMetaJson = JsonNode.Parse(
            appMetaText,
            null,
            new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
        );
        if (appMetaJson is not JsonObject appMetaJsonObject)
        {
            _warnings.Add($"Unable to parse applicationmetadata.json, skipping layout sets upgrade");
            return;
        }

        // Read dataTypes array
        JsonNode? dataTypes;
        try
        {
            appMetaJsonObject.TryGetPropertyValue("dataTypes", out dataTypes);
        }
        catch (Exception e)
        {
            // Duplicate keys in the object will throw an exception here
            _warnings.Add(
                $"Unable to parse applicationmetadata.json, skipping layout sets upgrade, error: {e.Message}"
            );
            return;
        }

        if (dataTypes is not JsonArray dataTypesArray)
        {
            _warnings.Add(
                $"dataTypes has unexpected value {dataTypes?.ToJsonString()} in applicationmetadata.json, expected an array"
            );
            return;
        }

        String? dataTypeId = null;
        String? taskId = null;

        foreach (JsonNode? dataType in dataTypesArray)
        {
            if (dataType is not JsonObject dataTypeObject)
            {
                _warnings.Add(
                    $"Unable to parse data type {dataType?.ToJsonString()} in applicationmetadata.json, expected an object"
                );
                continue;
            }

            if (!dataTypeObject.TryGetPropertyValue("appLogic", out var appLogic))
            {
                continue;
            }

            if (appLogic is not JsonObject appLogicObject)
            {
                _warnings.Add(
                    $"Unable to parse appLogic {appLogic?.ToJsonString()} in applicationmetadata.json, expected an object"
                );
                continue;
            }

            if (!appLogicObject.ContainsKey("classRef"))
            {
                continue;
            }

            // This object has a class ref, use this datatype and task id

            if (!dataTypeObject.TryGetPropertyValue("id", out var dataTypeIdNode))
            {
                _warnings.Add($"Unable to find id in {dataTypeObject.ToJsonString()} in applicationmetadata.json");
                break;
            }

            if (!dataTypeObject.TryGetPropertyValue("taskId", out var taskIdNode))
            {
                _warnings.Add(
                    $"Unable to find taskId in dataType {dataTypeIdNode?.ToJsonString()} in applicationmetadata.json"
                );
                break;
            }

            if (
                dataTypeIdNode is not JsonValue dataTypeIdValue
                || dataTypeIdValue.GetValueKind() != JsonValueKind.String
            )
            {
                _warnings.Add(
                    $"Unable to parse id {dataTypeIdNode?.ToJsonString()} in applicationmetadata.json, expected a string"
                );
                break;
            }

            if (taskIdNode is not JsonValue taskIdValue || taskIdValue.GetValueKind() != JsonValueKind.String)
            {
                _warnings.Add(
                    $"Unable to parse taskId {taskIdNode?.ToJsonString()} in applicationmetadata.json, expected a string"
                );
                break;
            }

            dataTypeId = dataTypeIdValue.GetValue<string>();
            taskId = taskIdValue.GetValue<string>();
            break;
        }

        if (dataTypeId is null || taskId is null)
        {
            _warnings.Add(
                $"Unable to find a data model (data type with classRef and task) in applicationmetadata.json, skipping layout sets upgrade. Please add a data model and try again."
            );
            return;
        }

        var layoutSetsJsonString =
            $@"{{""$schema"": ""https://altinncdn.no/schemas/json/layout/layout-sets.schema.v1.json"", ""sets"": [{{""id"": ""{_layoutSetName}"", ""dataType"": ""{dataTypeId}"", ""tasks"": [""{taskId}""]}}]}}";
        _layoutSetsJson = JsonNode.Parse(layoutSetsJsonString);
    }

    public async Task Write()
    {
        if (_layoutSetsJson is null)
        {
            return;
        }

        JsonSerializerOptions options = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };

        // Create new layout set folder
        Directory.CreateDirectory(Path.Combine(_uiFolder, _layoutSetName));

        // Move existing files to new layout set
        var oldLayoutsPath = Path.Combine(_uiFolder, "layouts");
        var newLayoutsPath = Path.Combine(_uiFolder, _layoutSetName, "layouts");
        if (Directory.Exists(oldLayoutsPath))
        {
            if (Directory.Exists(newLayoutsPath))
            {
                if (Directory.EnumerateFileSystemEntries(newLayoutsPath).Any())
                {
                    throw new InvalidOperationException($"The folder {newLayoutsPath} already exists and is not empty");
                }

                Directory.Delete(newLayoutsPath, false);
            }

            Directory.Move(oldLayoutsPath, newLayoutsPath);
        }
        else
        {
            Directory.CreateDirectory(newLayoutsPath);
            if (File.Exists(Path.Combine(_uiFolder, "FormLayout.json")))
            {
                File.Move(Path.Combine(_uiFolder, "FormLayout.json"), Path.Combine(newLayoutsPath, "FormLayout.json"));
            }
        }

        var oldSettingsPath = Path.Combine(_uiFolder, "Settings.json");
        var newSettingsPath = Path.Combine(_uiFolder, _layoutSetName, "Settings.json");
        if (File.Exists(oldSettingsPath))
        {
            File.Move(oldSettingsPath, newSettingsPath);
        }

        var oldRuleConfigurationPath = Path.Combine(_uiFolder, "RuleConfiguration.json");
        var newRuleConfigurationPath = Path.Combine(_uiFolder, _layoutSetName, "RuleConfiguration.json");
        if (File.Exists(oldRuleConfigurationPath))
        {
            File.Move(oldRuleConfigurationPath, newRuleConfigurationPath);
        }

        var oldRuleHandlerPath = Path.Combine(_uiFolder, "RuleHandler.js");
        var newRuleHandlerPath = Path.Combine(_uiFolder, _layoutSetName, "RuleHandler.js");
        if (File.Exists(oldRuleHandlerPath))
        {
            File.Move(oldRuleHandlerPath, newRuleHandlerPath);
        }

        // Write new layout-sets.json
        await File.WriteAllTextAsync(
            Path.Combine(_uiFolder, "layout-sets.json"),
            _layoutSetsJson.ToJsonString(options)
        );
    }
}
