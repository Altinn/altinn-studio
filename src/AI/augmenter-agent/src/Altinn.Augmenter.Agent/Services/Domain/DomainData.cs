namespace Altinn.Augmenter.Agent.Services.Domain;

public sealed class KommunerData
{
    public required KommuneEntry Default { get; init; }
    public Dictionary<string, KommuneEntry> Kommuner { get; init; } = new();
}

public sealed class KommuneEntry
{
    public required string Navn { get; init; }
    public required string KlageEpost { get; init; }
}

public sealed class BevillingstyperData
{
    public string Default { get; init; } = "enkeltbevilling";
    public List<string> Lovhenvisninger { get; init; } = new();
    public Dictionary<string, string> Mapping { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class MappingRule
{
    public List<string> Contains { get; init; } = new();
    public bool RequireAll { get; init; }
    public bool Fallback { get; init; }
    public required string Value { get; init; }
}

public sealed class AlkoholgrupperData
{
    public required RuleSet Checklist { get; init; }
}

public sealed class RuleSet
{
    public string Default { get; init; } = "";
    public List<MappingRule> Rules { get; init; } = new();
}

public sealed class SjekklisteData
{
    public string DefaultStatus { get; init; } = "ikke_vurdert";
    public List<SjekklisteSeksjon> Seksjoner { get; init; } = new();
}

public sealed class SjekklisteSeksjon
{
    public required string Id { get; init; }
    public required string Label { get; init; }
    public List<SjekklistePunkt> Punkter { get; init; } = new();
}

public sealed class SjekklistePunkt
{
    public required string Id { get; init; }
    public required string Label { get; init; }
}
