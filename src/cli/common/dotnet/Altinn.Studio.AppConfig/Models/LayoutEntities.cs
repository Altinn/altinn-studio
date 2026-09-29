using System.Collections.Frozen;
using System.Collections.ObjectModel;
using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Models;

public sealed class LayoutSet
{
    public required string Id { get; init; }
    public required DataTypeReference? DefaultDataReq { get; init; }
    public required IReadOnlyList<PageFileReference> PageFileRefs { get; init; }
    public required IReadOnlyDictionary<string, LayoutComponent> Components { get; init; }
    public required IReadOnlyList<LayoutComponent> AllComponents { get; init; }
    public required SourceSpan Position { get; init; }
}

internal sealed class LayoutSetBuilder
{
    public string Id { get; init; } = "";
    public DataTypeReference? DefaultDataReq { get; set; }
    public List<PageFileReference> PageFileRefs { get; } = new();
    public Dictionary<string, LayoutComponent> Components { get; } = new();
    public List<LayoutComponent> AllComponents { get; } = new();
    public SourceSpan Position { get; set; }

    public LayoutSet Freeze() =>
        new()
        {
            Id = Id,
            DefaultDataReq = DefaultDataReq,
            PageFileRefs = PageFileRefs.AsReadOnly(),
            Components = Components.AsReadOnly(),
            AllComponents = AllComponents.AsReadOnly(),
            Position = Position,
        };
}

public enum LayoutFolderRole
{
    Task,
    Referenced,
    Receipt,
    Unused,
}

public sealed class LayoutComponent
{
    public string Id { get; init; } = "";
    public string Type { get; init; } = "";
    public string Page { get; init; } = "";
    public string LayoutSet { get; init; } = "";

    public IReadOnlyDictionary<string, ComponentBinding> Bindings { get; init; } =
        FrozenDictionary<string, ComponentBinding>.Empty;
    public IReadOnlyList<string> Children { get; init; } = ReadOnlyCollection<string>.Empty;

    public bool HasOptionSource { get; init; }
    public SourceSpan Position { get; init; }
}

public sealed class TextResources
{
    public string Language { get; init; } = "";

    public IReadOnlyDictionary<string, SourceSpan> Ids { get; init; } = FrozenDictionary<string, SourceSpan>.Empty;

    public IReadOnlyDictionary<string, string> Values { get; init; } = FrozenDictionary<string, string>.Empty;
    public SourceSpan Position { get; init; }
}
