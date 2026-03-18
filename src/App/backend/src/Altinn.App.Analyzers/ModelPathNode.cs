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
        bool isNullable,
        ModelPathNode[]? properties = null,
        string? listType = null,
        bool isNullableList = false
    )
    {
        CSharpName = cSharpName;
        JsonName = jsonName;
        ListType = listType;
        IsNullableList = isNullableList;
        TypeName = typeName;
        IsNullable = isNullable;
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

    public bool IsNullable { get; }

    public string TypeNameWithNullable => IsNullable ? $"{TypeName}?" : TypeName;

    /// <summary>
    /// If this is a list property, this is the type of the list. (eg System.Collections.Generic.List)
    /// </summary>
    /// <remarks>
    /// We assume this is a subtype of <see cref="ICollection{T}"/>
    /// </remarks>
    public string? ListType { get; }
    public bool IsNullableList { get; }

    public string? ListTypeWithNullable => IsNullableList ? $"{ListType}?" : ListType;

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

    public bool IsCSharpValueType()
    {
        return TypeName switch
        {
            "global::System.Guid" => true,
            "global::System.DateTime" => true,
            "global::System.DateTimeOffset" => true,
            "global::System.TimeSpan" => true,
            "global::System.DateOnly" => true,
            "global::System.TimeOnly" => true,
            "global::System.Int32" => true,
            "global::System.Int64" => true,
            "global::System.UInt32" => true,
            "global::System.UInt64" => true,
            "global::System.Single" => true,
            "global::System.Double" => true,
            "global::System.Decimal" => true,
            "global::System.Boolean" => true,
            "global::System.Char" => true,
            "global::System.Byte" => true,
            "global::System.SByte" => true,
            "global::System.Int16" => true,
            "global::System.UInt16" => true,
            "int" => true,
            "long" => true,
            "uint" => true,
            "ulong" => true,
            "float" => true,
            "double" => true,
            "decimal" => true,
            "bool" => true,
            "char" => true,
            "byte" => true,
            "sbyte" => true,
            "short" => true,
            "ushort" => true,
            _ => false,
        };
    }
};
