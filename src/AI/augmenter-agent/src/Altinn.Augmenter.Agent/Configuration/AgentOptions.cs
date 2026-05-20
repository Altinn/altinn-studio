namespace Altinn.Augmenter.Agent.Configuration;

public sealed class AgentOptions
{
    public const string SectionName = "Agent";

    /// <summary>
    /// Agent provider: <c>sandkasse-http</c> (production, default) or
    /// <c>claude-cli</c> (local dev, requires the Claude CLI on PATH).
    /// </summary>
    public string Provider { get; set; } = "sandkasse-http";

    /// <summary>
    /// Base URL for the OpenAI-compatible gateway. Must include the version
    /// segment (e.g. <c>/v1</c>). Required for <c>sandkasse-http</c>.
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
    /// <c>telenor:gemma4</c>). Required for <c>sandkasse-http</c>.
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// Maximum completion tokens. Stay under the gateway's
    /// <c>max_total_tokens</c> minus the prompt length.
    /// </summary>
    public int MaxTokens { get; set; } = 4096;

    /// <summary>
    /// Sampling temperature. 0 = deterministic-as-possible.
    /// </summary>
    public double Temperature { get; set; }

    /// <summary>
    /// Maximum time in seconds to wait for the agent to complete.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 300;

    // --- claude-cli dev-fallback fields below ---

    /// <summary>
    /// Path to the Claude CLI executable, used only when Provider is
    /// <c>claude-cli</c>. Defaults to <c>claude</c> (on PATH).
    /// </summary>
    public string CliPath { get; set; } = "claude";
}
