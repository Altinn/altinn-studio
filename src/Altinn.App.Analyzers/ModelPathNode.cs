using System.Diagnostics;
using Altinn.App.Analyzers.Utils;

namespace Altinn.App.Analyzers;

/// <summary>
/// Node used to represent the shape of a model for the purpose of generating code.
/// Somewhat similar to a JSON schema.
/// </summary>
[DebuggerDisplay("{_debugDisplayString}")]
public record ModelPathNode
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ModelPathNode"/> class.
    /// </summary>
    public ModelPathNode(
        string cSharpName,
        string jsonName,
        string typeName,
        ModelPathNode[]? properties = null,
        string? listType = null
    )
    {
        CSharpName = cSharpName;
        JsonName = jsonName;
        ListType = listType;
        TypeName = typeName;
        IsJsonValueType = properties is null;
        Properties = properties ?? [];
    }

    /// <summary>
    /// The full type name with safe characters for C# identifier name
    /// </summary>
    public string Name =>
        TypeName
            .Replace('+', '_')
            .Replace('.', '_')
            .Replace('<', '_')
            .Replace('>', '_')
            .Replace("?", "")
            .Replace("global::", "");

    /// <summary>
    /// The fully qualified type name, excluding nullable annotations and the "global::" prefix.
    /// </summary>
    public string FullName => TypeName.Replace("?", "").Replace("global::", "");

    /// <summary>
    /// The name used in json to access this property. The [JsonPropertyName("")] value.
    /// </summary>
    public string JsonName { get; }

    /// <summary>
    /// The name used in C# to access this property. Used for direct access in source generated code.
    /// </summary>
    public string CSharpName { get; }

    /// <summary>
    /// The FullName for the type of the property or element of list including global::.
    /// </summary>
    public string TypeName { get; }

    /// <summary>
    /// If this is a list property, this is the type of the list. (eg System.Collections.Generic.List)
    /// </summary>
    /// <remarks>
    /// We assume this is a subtype of <see cref="ICollection{T}"/>
    /// </remarks>
    public string? ListType { get; }

    /// <summary>
    /// Indicates whether the type represented by this node is to be treated as primitive immutable value.
    /// </summary>
    public bool IsJsonValueType { get; }

    /// <summary>
    /// The sub properties of this node.
    /// </summary>
    [DebuggerBrowsable(DebuggerBrowsableState.RootHidden)]
    public EquatableArray<ModelPathNode> Properties { get; init; }

    private string _debugDisplayString =>
        $"{JsonName}{(ListType is null ? "" : "[]")} with {Properties.Count} children";

    /// <summary>
    /// Determines whether the current node represents an AltinnRowId.
    /// </summary>
    public bool IsAltinnRowId()
    {
        return this is { JsonName: "altinnRowId", CSharpName: "AltinnRowId", TypeName: "global::System.Guid" };
    }
};
