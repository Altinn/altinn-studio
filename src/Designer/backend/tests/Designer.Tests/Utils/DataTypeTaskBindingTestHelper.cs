using System.IO;
using System.Linq;
using System.Text.Json.Nodes;

namespace Designer.Tests.Utils;

/// <summary>
/// Works on the raw JSON of applicationmetadata.json, so that tests can tell an absent <c>taskId</c> or
/// <c>taskIds</c> from an empty one.
/// </summary>
public static class DataTypeTaskBindingTestHelper
{
    /// <summary>
    /// Removes each property that is passed as null.
    /// </summary>
    public static void WriteTaskBinding(string repositoryPath, string dataTypeId, string taskId, string[] taskIds)
    {
        string applicationMetadataPath = GetApplicationMetadataPath(repositoryPath);
        JsonNode applicationMetadata = JsonNode.Parse(File.ReadAllText(applicationMetadataPath));
        JsonObject dataType = FindDataType(applicationMetadata, dataTypeId);

        dataType.Remove("taskId");
        if (taskId is not null)
        {
            dataType["taskId"] = taskId;
        }

        dataType.Remove("taskIds");
        if (taskIds is not null)
        {
            dataType["taskIds"] = new JsonArray(taskIds.Select(id => JsonValue.Create(id)).ToArray<JsonNode>());
        }

        File.WriteAllText(applicationMetadataPath, applicationMetadata.ToJsonString());
    }

    public static JsonObject ReadDataType(string repositoryPath, string dataTypeId)
    {
        JsonNode applicationMetadata = JsonNode.Parse(File.ReadAllText(GetApplicationMetadataPath(repositoryPath)));
        return FindDataType(applicationMetadata, dataTypeId);
    }

    public static string[] ReadTaskIds(JsonObject dataType) =>
        dataType["taskIds"]?.AsArray().Select(taskId => taskId.GetValue<string>()).ToArray();

    private static string GetApplicationMetadataPath(string repositoryPath) =>
        Path.Combine(repositoryPath, "App", "config", "applicationmetadata.json");

    private static JsonObject FindDataType(JsonNode applicationMetadata, string dataTypeId) =>
        applicationMetadata["dataTypes"]
            .AsArray()
            .Single(dataType => dataType["id"].GetValue<string>() == dataTypeId)
            .AsObject();
}
