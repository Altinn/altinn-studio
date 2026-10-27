using System.Text.Json;
using Altinn.App.Ai.Enrichment.Models;

namespace Altinn.App.Ai.Enrichment.Pipeline;

/// <summary>One step in an agent's pipeline, executed in agent.yaml declaration order.</summary>
public interface IEnrichmentStep
{
    string Name { get; }

    /// <summary>
    /// Executes the step over the application data and returns zero or more
    /// produced files. Steps may also publish JSON into <paramref name="context"/>
    /// for later steps (and for the caller) to read.
    /// </summary>
    Task<IReadOnlyList<GeneratedFile>> ExecuteAsync(
        JsonDocument application,
        PipelineContext context,
        CancellationToken cancellationToken = default);
}
