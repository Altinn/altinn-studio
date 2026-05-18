using System.Text.Json;

namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Parses the agent's raw text response into a JsonDocument, with optional
/// validation of expected top-level keys. Returns null if the response is
/// invalid (caller should then fall back).
/// Implementations are registered as keyed services in DI.
/// </summary>
public interface IResponseParser
{
    JsonDocument? Parse(string response, StepDefinition stepDefinition);
}
