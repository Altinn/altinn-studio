namespace Altinn.Augmenter.Agent.Services.Agent.Orchestration;

/// <summary>One item's rule, loaded from a markdown file in the rules folder.</summary>
public sealed record RuleEntry
{
    /// <summary>Stable identifier for the item — typically the markdown filename minus ".md".</summary>
    public required string Key { get; init; }

    /// <summary>Full markdown body of the rule, passed verbatim to the LLM.</summary>
    public required string Markdown { get; init; }
}

/// <summary>Verdict produced by the orchestrator for a single item.</summary>
public sealed record ItemVerdict
{
    /// <summary>Status value defined by the system prompt (e.g. vurdert_ok / vurdert_avslag / maa_undersokes / ikke_relevant / ikke_vurdert in the bevillings-config).</summary>
    public required string Status { get; init; }

    public required string Merknad { get; init; }
}
