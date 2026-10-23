using System.Text.Json;
using Altinn.App.Ai.Enrichment.Models;
using Altinn.App.Ai.Enrichment.Pipeline;

namespace Altinn.App.Ai.Enrichment.Agents;

/// <summary>
/// A loaded, validated agent ready to run. Executes the agent's steps in
/// declaration order over one application document. Step failures propagate —
/// in a process step, a partial result must fail the task rather than silently
/// producing incomplete output (the process engine's retry semantics take over).
/// </summary>
public sealed class AgentRuntime
{
    private readonly IReadOnlyList<IEnrichmentStep> _steps;
    private readonly ILogger _logger;

    internal AgentRuntime(string name, IReadOnlyList<IEnrichmentStep> steps, ILogger logger)
    {
        Name = name;
        _steps = steps;
        _logger = logger;
    }

    public string Name { get; }

    public async Task<EnrichmentResult> ExecuteAsync(
        JsonDocument application,
        CancellationToken cancellationToken = default)
    {
        var context = new PipelineContext();
        var files = new List<GeneratedFile>();

        foreach (var step in _steps)
        {
            _logger.LogInformation("Agent {AgentName}: running step {StepName}", Name, step.Name);
            var produced = await step.ExecuteAsync(application, context, cancellationToken);

            foreach (var file in produced)
            {
                files.Add(file);
                _logger.LogInformation(
                    "Step {StepName} produced: {FileName} ({Size} bytes)",
                    step.Name, file.Name, file.Data.Length);
            }
        }

        return new EnrichmentResult { Files = files, Context = context };
    }
}

/// <summary>What an agent run produced: files to store, plus everything steps published.</summary>
public sealed record EnrichmentResult
{
    public required IReadOnlyList<GeneratedFile> Files { get; init; }
    public required PipelineContext Context { get; init; }
}
