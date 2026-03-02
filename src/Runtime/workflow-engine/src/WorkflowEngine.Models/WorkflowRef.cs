using System.Text.Json.Serialization;
using WorkflowEngine.Models.JsonConverters;

// CA2225: Operator overloads have named alternates
#pragma warning disable CA2225

namespace WorkflowEngine.Models;

/// <summary>
/// A reference to a workflow that can be either a batch-scoped alias string or an already-persisted database ID.
/// Serializes as a JSON string or number, e.g. <c>["local-ref1", 1234, "local-ref2"]</c>.
/// </summary>
[JsonConverter(typeof(WorkflowRefConverter))]
public readonly record struct WorkflowRef
{
    private readonly string? _ref;
    private readonly long? _id;

    private WorkflowRef(string @ref)
    {
        _ref = @ref;
        _id = null;
    }

    private WorkflowRef(long id)
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
    public long Id => _id ?? throw new InvalidOperationException("WorkflowRef is a ref string, not an ID.");

    public static implicit operator WorkflowRef(string @ref) => new(@ref);

    public static implicit operator WorkflowRef(long id) => new(id);

    public static WorkflowRef FromRefString(string @ref) => new(@ref);

    public static WorkflowRef FromDatabaseId(long id) => new(id);

    public override string ToString() => IsRef ? $"ref:{_ref}" : $"id:{_id}";
}
