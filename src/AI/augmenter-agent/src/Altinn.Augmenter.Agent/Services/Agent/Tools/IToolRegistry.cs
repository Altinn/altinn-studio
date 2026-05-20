using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Holds the 8 deterministic tools and dispatches model-issued tool_calls
/// to the right implementation. Used by <c>EvaluationOrchestrator</c> inside
/// the per-item tool-loop.
/// </summary>
public interface IToolRegistry
{
    /// <summary>Definitions to pass in the chat-completions <c>tools</c> array.</summary>
    IReadOnlyList<ToolDefinition> Definitions { get; }

    /// <summary>
    /// Invoke a tool by name and return its result already serialized as a JSON
    /// string ready to drop into a <c>role: tool</c> message's <c>content</c>.
    /// Unknown tools and bad arguments produce { "error": "..." } JSON, never throw.
    /// </summary>
    string Dispatch(string name, JsonElement arguments, JsonDocument application);
}
