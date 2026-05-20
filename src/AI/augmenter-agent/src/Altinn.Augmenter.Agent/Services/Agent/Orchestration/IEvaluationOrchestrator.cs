using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services.Agent.Orchestration;

/// <summary>
/// Evaluates each item independently via per-item LLM loops that may invoke
/// deterministic tools. Returns a verdict-per-item map; translating that map
/// into a domain-shaped output (e.g. <c>{sjekkliste:{...}}</c>) is the
/// caller's job — the orchestrator stays domain-neutral.
/// </summary>
public interface IEvaluationOrchestrator
{
    Task<OrchestratorResult> RunAsync(
        JsonDocument application,
        IReadOnlyList<RuleEntry> rules,
        OrchestratorOptions options,
        CancellationToken cancellationToken = default);
}

public sealed record OrchestratorOptions
{
    /// <summary>Hard cap on tool-call iterations per item before forcing a default verdict.</summary>
    public int MaxToolIterations { get; init; } = 5;

    /// <summary>Max parallel per-item loops in flight.</summary>
    public int Concurrency { get; init; } = 5;

    /// <summary>If set, write per-item JSON traces here. Folder is created if needed.</summary>
    public string? TraceDirAbsolutePath { get; init; }
}

public sealed record OrchestratorResult
{
    public required IReadOnlyDictionary<string, ItemVerdict> Verdicts { get; init; }
    public int TotalLlmCalls { get; init; }
    public int TotalToolCalls { get; init; }
    public long WallTimeMs { get; init; }
}
