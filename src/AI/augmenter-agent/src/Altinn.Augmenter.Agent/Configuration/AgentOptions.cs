namespace Altinn.Augmenter.Agent.Configuration;

/// <summary>
/// Options for the OpenAI-compatible chat-completions gateway used by
/// <see cref="Services.Agent.Chat.SandkasseChatService"/>.
/// </summary>
public sealed class AgentOptions
{
    public const string SectionName = "Agent";

    /// <summary>
    /// Base URL for the gateway. Must include the version segment (e.g. <c>/v1</c>).
    /// Example: <c>https://gw.sandkasse.ai/v1</c>.
    /// </summary>
    public string? BaseUrl { get; set; }

    /// <summary>
    /// API key for the gateway. Typically supplied via SANDKASSE_API_KEY env var
    /// and bound here through configuration.
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>
    /// Model identifier passed in the chat-completions request (e.g.
    /// <c>telenor:gemma4</c>).
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// Maximum completion tokens. Stay under the gateway's
    /// <c>max_total_tokens</c> minus the prompt length.
    /// </summary>
    public int MaxTokens { get; set; } = 4096;

    /// <summary>Sampling temperature. 0 = deterministic-as-possible.</summary>
    public double Temperature { get; set; }

    /// <summary>
    /// Request server-sent-event streaming. Keeps the connection alive while
    /// the model is processing, which bypasses the gateway's pre-first-token
    /// timeout (~30s on sandkasse) for long prompts. Recommended on.
    /// </summary>
    public bool UseStreaming { get; set; } = true;

    /// <summary>Maximum time in seconds to wait for a single chat call.</summary>
    public int TimeoutSeconds { get; set; } = 300;
}
