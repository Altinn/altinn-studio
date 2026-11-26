using System.Text.Json.Nodes;

namespace Altinn.Studio.Preview.AppApi;

/// <summary>A data type in the app's application metadata.</summary>
/// <param name="Id">The data type's ID.</param>
/// <param name="TaskIds">
/// The tasks its data elements belong to, if any. A v9 app names them in <c>taskIds</c> and doesn't read
/// <c>taskId</c>, where a v8 app names its one task.
/// </param>
/// <param name="ClassRef">The model class of a form data type, or <c>null</c> for other data, such as attachments.</param>
/// <param name="AutoCreate">Whether the app creates a data element of the type when one of its tasks starts.</param>
internal sealed record DataType(string Id, IReadOnlyList<string> TaskIds, string? ClassRef, bool AutoCreate)
{
    public bool IsFormData => ClassRef is not null;

    public bool BelongsTo(string taskId) => TaskIds.Contains(taskId, StringComparer.Ordinal);

    public bool IsWritable(DataElement element, string? currentTask) =>
        TaskIds.Count > 0 ? currentTask is not null && BelongsTo(currentTask) : !element.Locked;

    public static IReadOnlyList<DataType> Of(AppFiles files) =>
        From(files.ApplicationMetadata(), AppGenerations.Of(files.AppLibVersion()));

    public static IReadOnlyList<DataType> From(JsonObject? applicationMetadata, AppGeneration? generation) =>
        [
            .. (applicationMetadata?["dataTypes"] as JsonArray ?? [])
                .OfType<JsonObject>()
                .Select(dataType =>
                    Text(dataType["id"]) is { } id
                        ? new DataType(
                            id,
                            TaskIdsOf(dataType, generation),
                            Text(dataType["appLogic"]?["classRef"]),
                            dataType["appLogic"]?["autoCreate"] is JsonValue autoCreate
                                && autoCreate.TryGetValue(out bool create)
                                && create
                        )
                        : null
                )
                .OfType<DataType>(),
        ];

    private static IReadOnlyList<string> TaskIdsOf(JsonObject dataType, AppGeneration? generation)
    {
        IEnumerable<string?> taskIds =
            generation is AppGeneration.V8
                ? [Text(dataType["taskId"])]
                : (dataType["taskIds"] as JsonArray ?? []).Select(Text);
        return [.. taskIds.OfType<string>()];
    }

    private static string? Text(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue(out string? text) ? text : null;
}
