#nullable enable
using System;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Designer.Helpers;

public static class ApplicationMetadataJsonHelper
{
    public static string SetCopyInstanceEnabled(string json, bool enabled, JsonSerializerOptions? serializationOptions = null)
    {
        var jsonObj = ParseAndEnsureJsonObject(json);
        bool usesPascalCase = UsesPascalCaseProps(jsonObj);
        var keys = new
        {
            CopyInstance = usesPascalCase ? "CopyInstanceSettings" : "copyInstanceSettings",
            Enabled = usesPascalCase ? "Enabled" : "enabled"
        };

        if (jsonObj[keys.CopyInstance] is not JsonObject config)
        {
            config = new JsonObject();
            jsonObj[keys.CopyInstance] = config;
        }

        config[keys.Enabled] = enabled;

        return jsonObj.ToJsonString(serializationOptions);
    }

    public static string SetId(string json, string id, JsonSerializerOptions? serializationOptions = null)
    {
        var jsonObj = ParseAndEnsureJsonObject(json);
        string key = UsesPascalCaseProps(jsonObj) ? "Id" : "id";

        jsonObj[key] = id;

        return jsonObj.ToJsonString(serializationOptions);
    }

    public static string SetVersionId(string json, string versionId, JsonSerializerOptions? serializationOptions = null)
    {
        var jsonObj = ParseAndEnsureJsonObject(json);
        string key = UsesPascalCaseProps(jsonObj) ? "VersionId" : "versionId";

        jsonObj[key] = versionId;

        return jsonObj.ToJsonString(serializationOptions);
    }

    private static JsonObject ParseAndEnsureJsonObject(string json)
    {
        JsonNode? rootNode = JsonNode.Parse(json);
        if (rootNode is not JsonObject jsonObj)
        {
            throw new InvalidOperationException($"Invalid JSON input: Expected a JSON object, got {rootNode?.GetType().Name}");
        }

        return jsonObj;
    }

    private static bool UsesPascalCaseProps(JsonObject obj)
    {
        foreach (var property in obj)
        {
            if (string.IsNullOrEmpty(property.Key))
            {
                continue;
            }

            return char.IsUpper(property.Key[0]);
        }

        return false;
    }
}
