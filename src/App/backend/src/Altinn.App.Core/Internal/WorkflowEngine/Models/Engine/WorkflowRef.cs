using System.Text.Json;
using System.Text.Json.Serialization;

// CA2225: Operator overloads have named alternates
#pragma warning disable CA2225

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// A reference to a workflow that can be either a batch-scoped alias string or an already-persisted database ID.
/// Serializes as a JSON string, e.g. <c>["local-ref1", "d4e5f6a7-...", "local-ref2"]</c>.
/// GUIDs are distinguished from ref strings by format (parseable as <see cref="Guid"/>).
/// </summary>
[JsonConverter(typeof(WorkflowRefConverter))]
internal readonly record struct WorkflowRef
{
    private readonly string? _ref;
    private readonly Guid? _id;

    private WorkflowRef(string @ref)
    {
        _ref = @ref;
        _id = null;
    }

    private WorkflowRef(Guid id)
    {
        _ref = null;
        _id = id;
    }

    /// <summary>
    /// Whether this is a batch-scoped alias string.
    /// </summary>
    public bool IsRef => _ref is not null;

    /// <summary>
    /// Whether this is a persisted database ID.
    /// </summary>
    public bool IsId => _id.HasValue;

    /// <summary>
    /// The batch-scoped alias. Only valid when <see cref="IsRef"/> is true.
    /// </summary>
    public string Ref => _ref ?? throw new InvalidOperationException("WorkflowRef is an ID, not a ref string.");

    /// <summary>
    /// The persisted database ID. Only valid when <see cref="IsId"/> is true.
    /// </summary>
    public Guid Id => _id ?? throw new InvalidOperationException("WorkflowRef is a ref string, not an ID.");

    public static implicit operator WorkflowRef(string @ref) => new(@ref);

    public static implicit operator WorkflowRef(Guid id) => new(id);

    public static WorkflowRef FromRefString(string @ref) => new(@ref);

    public static WorkflowRef FromDatabaseId(Guid id) => new(id);

    /// <inheritdoc/>
    public override string ToString() => IsRef ? $"ref:{_ref}" : $"id:{_id}";
}

internal sealed class WorkflowRefConverter : JsonConverter<WorkflowRef>
{
    public override WorkflowRef Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.String => ReadStringAndClassify(ref reader),
            _ => throw new JsonException($"Expected a string (batch ref or UUID database ID), got {reader.TokenType}."),
        };

    public override void Write(Utf8JsonWriter writer, WorkflowRef value, JsonSerializerOptions options)
    {
        if (value.IsRef)
            writer.WriteStringValue(value.Ref);
        else
            writer.WriteStringValue(value.Id.ToString());
    }

    private static WorkflowRef ReadStringAndClassify(ref Utf8JsonReader reader)
    {
        string? value = reader.GetString();
        if (string.IsNullOrWhiteSpace(value))
            throw new JsonException($"Expected non-empty string value, but got `{value}`");

        // If it parses as a GUID, treat it as a database ID; otherwise treat as a batch ref
        if (Guid.TryParse(value, out var guid))
            return WorkflowRef.FromDatabaseId(guid);

        return WorkflowRef.FromRefString(value);
    }
}
