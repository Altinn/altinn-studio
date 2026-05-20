namespace Altinn.Augmenter.Agent.Services.Agent.Orchestration;

/// <summary>One sjekkliste-punkt's rule, loaded from a markdown file in the rules folder.</summary>
public sealed record RuleEntry
{
    /// <summary>Punkt-key in <c>section.punkt</c> format (matches the filename minus ".md").</summary>
    public required string PunktKey { get; init; }

    /// <summary>Full markdown body of the rule, passed verbatim to the LLM.</summary>
    public required string Markdown { get; init; }
}

/// <summary>Verdict produced by the orchestrator for a single punkt.</summary>
public sealed record PunktVerdict
{
    /// <summary>One of: vurdert_ok, vurdert_avslag, maa_undersokes, ikke_relevant, ikke_vurdert.</summary>
    public required string Status { get; init; }

    public required string Merknad { get; init; }
}
