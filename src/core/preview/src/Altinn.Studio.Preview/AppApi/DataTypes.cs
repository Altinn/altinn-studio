using System.Text.Json.Nodes;

namespace Altinn.Studio.Preview.AppApi;

/// <summary>A data type in the app's application metadata.</summary>
/// <param name="Id">The data type's ID.</param>
/// <param name="TaskId">The task its data elements belong to, if any.</param>
/// <param name="ClassRef">The model class of a form data type, or <c>null</c> for other data, such as attachments.</param>
/// <param name="AutoCreate">Whether the app creates a data element of the type when its task starts.</param>
internal sealed record DataType(string Id, string? TaskId, string? ClassRef, bool AutoCreate)
{
    public bool IsFormData => ClassRef is not null;

    public static IReadOnlyList<DataType> From(JsonObject? applicationMetadata) =>
        [
            .. (applicationMetadata?["dataTypes"] as JsonArray ?? [])
                .OfType<JsonObject>()
                .Select(dataType =>
                    (string?)(dataType["id"] as JsonValue) is { } id
                        ? new DataType(
                            id,
                            (string?)(dataType["taskId"] as JsonValue),
                            (string?)(dataType["appLogic"]?["classRef"] as JsonValue),
                            dataType["appLogic"]?["autoCreate"] is JsonValue autoCreate
                                && autoCreate.TryGetValue(out bool create)
                                && create
                        )
                        : null
                )
                .OfType<DataType>(),
        ];
}
