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

    /// <summary>Override <c>AgentOptions.MaxTokens</c> for this call only. Null uses the configured value.</summary>
    public int? MaxTokens { get; init; }

    public double Temperature { get; init; }

    /// <summary>Override the model from AgentOptions for this call only.</summary>
    public string? Model { get; init; }

    /// <summary>Override <c>AgentOptions.UseStreaming</c> for this call only. Null uses the configured value.</summary>
    public bool? Stream { get; init; }
}
