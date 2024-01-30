using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutSetRewriter;

class LayoutSetUpgrader
{

    private readonly IList<string> warnings = new List<string>();
    private readonly string uiFolder;
    private readonly string layoutSetName;
    private readonly string applicationMetadataFile;
    private JsonNode? layoutSetsJson = null;

    public LayoutSetUpgrader(string uiFolder, string layoutSetName, string applicationMetadataFile)
    {
        this.uiFolder = uiFolder;
        this.layoutSetName = layoutSetName;
        this.applicationMetadataFile = applicationMetadataFile;
    }

    public IList<string> GetWarnings()
    {
        return warnings;
    }

    public void Upgrade()
    {
        // Read applicationmetadata.json file
        var appMetaText = File.ReadAllText(applicationMetadataFile);
        var appMetaJson = JsonNode.Parse(appMetaText, null, new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
        if (appMetaJson is not JsonObject appMetaJsonObject)
        {
            warnings.Add($"Unable to parse applicationmetadata.json, skipping layout sets upgrade");
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
            warnings.Add($"Unable to parse applicationmetadata.json, skipping layout sets upgrade, error: {e.Message}");
            return;
        }

        if (dataTypes is not JsonArray dataTypesArray)
        {
            warnings.Add($"dataTypes has unexpected value {dataTypes?.ToJsonString()} in applicationmetadata.json, expected an array");
            return;
        }

        String? dataTypeId = null;
        String? taskId = null;

        foreach (JsonNode? dataType in dataTypesArray)
        {
            if (dataType is not JsonObject dataTypeObject)
            {
                warnings.Add($"Unable to parse data type {dataType?.ToJsonString()} in applicationmetadata.json, expected an object");
                continue;
            }

            if (!dataTypeObject.TryGetPropertyValue("appLogic", out var appLogic))
            {
                continue;
            }

            if (appLogic is not JsonObject appLogicObject)
            {
                warnings.Add($"Unable to parse appLogic {appLogic?.ToJsonString()} in applicationmetadata.json, expected an object");
                continue;
            }

            if (!appLogicObject.ContainsKey("classRef"))
            {
                continue;
            }

            // This object has a class ref, use this datatype and task id

            if (!dataTypeObject.TryGetPropertyValue("id", out var dataTypeIdNode))
            {
                warnings.Add($"Unable to find id in {dataTypeObject.ToJsonString()} in applicationmetadata.json");
                break;
            }

            if (!dataTypeObject.TryGetPropertyValue("taskId", out var taskIdNode))
            {
                warnings.Add($"Unable to find taskId in dataType {dataTypeIdNode?.ToJsonString()} in applicationmetadata.json");
                break;
            }

            if (dataTypeIdNode is not JsonValue dataTypeIdValue || dataTypeIdValue.GetValueKind() != JsonValueKind.String)
            {
                warnings.Add($"Unable to parse id {dataTypeIdNode?.ToJsonString()} in applicationmetadata.json, expected a string");
                break;
            }

            if (taskIdNode is not JsonValue taskIdValue || taskIdValue.GetValueKind() != JsonValueKind.String)
            {
                warnings.Add($"Unable to parse taskId {taskIdNode?.ToJsonString()} in applicationmetadata.json, expected a string");
                break;
            }

            dataTypeId = dataTypeIdValue.GetValue<string>();
            taskId = taskIdValue.GetValue<string>();
            break;
        }

        if (dataTypeId == null || taskId == null)
        {
            warnings.Add($"Unable to find a data model (data type with classRef and task) in applicationmetadata.json, skipping layout sets upgrade. Please add a data model and try again.");
            return;
        }

        var layoutSetsJsonString = $@"{{""$schema"": ""https://altinncdn.no/schemas/json/layout/layout-sets.schema.v1.json"", ""sets"": [{{""id"": ""{layoutSetName}"", ""dataType"": ""{dataTypeId}"", ""tasks"": [""{taskId}""]}}]}}";
        layoutSetsJson = JsonNode.Parse(layoutSetsJsonString);
    }

    public async Task Write()
    {
        if (layoutSetsJson == null)
        {
            return;
        }

        JsonSerializerOptions options = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };

        // Create new layout set folder
        Directory.CreateDirectory(Path.Combine(uiFolder, layoutSetName));

        // Move existing files to new layout set
        var oldLayoutsPath = Path.Combine(uiFolder, "layouts");
        var newLayoutsPath = Path.Combine(uiFolder, layoutSetName, "layouts");
        if (Directory.Exists(oldLayoutsPath))
        {
            Directory.Move(oldLayoutsPath, newLayoutsPath);
        }
        else
        {
            Directory.CreateDirectory(newLayoutsPath);
            if (File.Exists(Path.Combine(uiFolder, "FormLayout.json")))
            {
                File.Move(Path.Combine(uiFolder, "FormLayout.json"), Path.Combine(newLayoutsPath, "FormLayout.json"));
            }
        }
        

        var oldSettingsPath = Path.Combine(uiFolder, "Settings.json");
        var newSettingsPath = Path.Combine(uiFolder, layoutSetName, "Settings.json");
        if (File.Exists(oldSettingsPath))
        {
            File.Move(oldSettingsPath, newSettingsPath);
        }

        var oldRuleConfigurationPath = Path.Combine(uiFolder, "RuleConfiguration.json");
        var newRuleConfigurationPath = Path.Combine(uiFolder, layoutSetName, "RuleConfiguration.json");
        if (File.Exists(oldRuleConfigurationPath))
        {
            File.Move(oldRuleConfigurationPath, newRuleConfigurationPath);
        }

        var oldRuleHandlerPath = Path.Combine(uiFolder, "RuleHandler.js");
        var newRuleHandlerPath = Path.Combine(uiFolder, layoutSetName, "RuleHandler.js");
        if (File.Exists(oldRuleHandlerPath))
        {
            File.Move(oldRuleHandlerPath, newRuleHandlerPath);
        }

        // Write new layout-sets.json
        await File.WriteAllTextAsync(Path.Combine(uiFolder, "layout-sets.json"), layoutSetsJson.ToJsonString(options));
    }
}
