using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Models;

public sealed record ComponentIdReference(
    string Value,
    string OwningComponentId,
    SourceSpan Position,
    string? InTaskId = null
);

public sealed record LayoutSetReference(string Value, SourceSpan Position);

public sealed record DataTypeReference(string Value, SourceSpan Position);

public sealed record TaskIdReference(string Value, SourceSpan Position);

public sealed record PageFileReference(string Value, SourceSpan Position, bool Ordered = true, string? InTaskId = null);

public sealed record DataModelReference(
    string Value,
    string OwningComponentId,
    string BindingName,
    SourceSpan Position,
    string? ExplicitDataType = null,
    string OwningComponentType = ""
);

public sealed record TextResourceReference(
    string Value,
    string OwningComponentId,
    string BindingName,
    SourceSpan Position
);

public sealed record OptionsIdReference(string Value, string OwningComponentId, SourceSpan Position);

public sealed record CSharpClassReference(string Value, SourceSpan Position);

public sealed record PolicyAttributeValue(string Attribute, string Value, SourceSpan Position);

public sealed class SemanticReferences
{
    public required IReadOnlyList<ComponentIdReference> ComponentIds { get; init; }
    public required IReadOnlyList<LayoutSetReference> LayoutSets { get; init; }
    public required IReadOnlyList<DataTypeReference> DataTypes { get; init; }
    public required IReadOnlyList<TaskIdReference> TaskIds { get; init; }
    public required IReadOnlyList<PageFileReference> PageFiles { get; init; }
    public required IReadOnlyList<DataModelReference> DataModel { get; init; }
    public required IReadOnlyList<TextResourceReference> TextResources { get; init; }
    public required IReadOnlyList<OptionsIdReference> OptionsIds { get; init; }
    public required IReadOnlyList<CSharpClassReference> CSharp { get; init; }
    public required IReadOnlyList<PolicyAttributeValue> PolicyOrgApps { get; init; }
}

internal sealed class SemanticReferencesBuilder
{
    public List<ComponentIdReference> ComponentIds { get; } = new();
    public List<LayoutSetReference> LayoutSets { get; } = new();
    public List<DataTypeReference> DataTypes { get; } = new();
    public List<TaskIdReference> TaskIds { get; } = new();
    public List<PageFileReference> PageFiles { get; } = new();
    public List<DataModelReference> DataModel { get; } = new();
    public List<TextResourceReference> TextResources { get; } = new();
    public List<OptionsIdReference> OptionsIds { get; } = new();
    public List<CSharpClassReference> CSharp { get; } = new();
    public List<PolicyAttributeValue> PolicyOrgApps { get; } = new();
}
