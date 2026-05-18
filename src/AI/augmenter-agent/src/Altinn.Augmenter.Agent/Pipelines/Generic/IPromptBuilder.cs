using System.Text.Json;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Builds the user prompt sent to the agent for an agent-pdf step.
/// Different step types/domains use different prompt shapes (raw data vs. schema-aware vs. context-consuming).
/// Implementations are registered as keyed services in DI.
/// </summary>
public interface IPromptBuilder
{
    Task<string> BuildAsync(
        string rawApplicationJson,
        JsonDocument mappedData,
        StepDefinition stepDefinition,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken);
}
