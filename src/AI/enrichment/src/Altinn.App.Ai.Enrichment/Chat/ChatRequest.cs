using Altinn.App.Ai.Enrichment.Tools;

namespace Altinn.App.Ai.Enrichment.Chat;

/// <summary>
/// Input to <see cref="IChatService.RunAsync"/>. Mirrors the OpenAI
/// chat-completions request shape minus transport concerns (model/base-url
/// come from AgentOptions; the service fills them in).
/// </summary>
public sealed record ChatRequest
{
    public required IReadOnlyList<ChatMessage> Messages { get; init; }

    /// <summary>If non-null and non-empty, the model receives the <c>tools</c> array and may emit tool_calls.</summary>
    public IReadOnlyList<ToolDefinition>? Tools { get; init; }

    /// <summary>OpenAI <c>tool_choice</c> override. Common values: "auto", "none", "required", or { "type": "function", "function": { "name": "..." } }.</summary>
    public string? ToolChoice { get; init; }

    public int MaxTokens { get; init; } = 2048;

    public double Temperature { get; init; }

    /// <summary>Override the model from AgentOptions for this call only.</summary>
    public string? Model { get; init; }

    /// <summary>Request SSE streaming. Defaults to off because per-punkt responses fit comfortably under the 60s gateway window.</summary>
    public bool Stream { get; init; }
}
