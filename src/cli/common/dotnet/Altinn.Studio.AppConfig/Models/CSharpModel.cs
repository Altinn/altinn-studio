using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Models;

public sealed record ModelTypeInfo(
    string FullyQualifiedName,
    IReadOnlyList<ModelProperty> Properties,
    SourceSpan? Span = null
);

public sealed record ModelProperty(
    string Name,
    ModelTypeRef Type,
    IReadOnlyList<string> AttributeNames,
    SourceSpan? Span,
    string JsonName
);

public sealed record ModelTypeRef(string Name, CollectionKind Collection, ModelTypeRef? ElementType);

public enum CollectionKind
{
    Scalar = 0,
    List = 1,
    Array = 2,
    Enumerable = 3,
}
