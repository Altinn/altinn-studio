using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services.Agent.Orchestration;

/// <summary>
/// Evaluates each punkt independently via per-punkt LLM-loops that may invoke
/// deterministic tools. Returns a verdict-per-punkt map; aggregation into the
/// final {sjekkliste:{...}} shape is the aggregator's job.
/// </summary>
public interface IChecklistOrchestrator
{
    Task<OrchestratorResult> RunAsync(
        JsonDocument application,
        IReadOnlyList<RuleEntry> rules,
        OrchestratorOptions options,
        CancellationToken cancellationToken = default);
}

public sealed record OrchestratorOptions
{
    /// <summary>Hard cap on tool-call iterations per punkt before forcing a default verdict.</summary>
    public int MaxToolIterations { get; init; } = 5;

    /// <summary>Max parallel per-punkt loops in flight.</summary>
    public int Concurrency { get; init; } = 5;

    /// <summary>If set, write per-punkt JSON traces here. Folder is created if needed.</summary>
    public string? TraceDirAbsolutePath { get; init; }
}

public sealed record OrchestratorResult
{
    public required IReadOnlyDictionary<string, PunktVerdict> Verdicts { get; init; }
    public int TotalLlmCalls { get; init; }
    public int TotalToolCalls { get; init; }
    public long WallTimeMs { get; init; }
}
