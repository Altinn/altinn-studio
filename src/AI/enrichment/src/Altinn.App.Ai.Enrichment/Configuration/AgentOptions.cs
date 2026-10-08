namespace Altinn.App.Ai.Enrichment.Configuration;

/// <summary>
/// Options for the OpenAI-compatible chat-completions gateway used by
/// <see cref="Chat.OpenAiCompatibleChatService"/>.
/// </summary>
public sealed class AgentOptions
{
    public const string SectionName = "AiEnrichment:Agent";

    /// <summary>
    /// Base URL for the gateway. Must include the version segment (e.g. <c>/v1</c>).
    /// Example: <c>https://gateway.example.com/v1</c>.
    /// </summary>
    public string? BaseUrl { get; set; }

    /// <summary>
    /// API key for the gateway. Bind from configuration for local dev; in an
    /// Altinn app the service-task registration resolves it through
    /// <c>ISecretsClient</c> (Key Vault) instead.
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>
    /// Name of the secret holding the API key, resolved through the app's
    /// <c>ISecretsClient</c> (Key Vault in TT02/prod, local secrets.json in dev)
    /// when <see cref="ApiKey"/> is not set. Only honored by the
    /// <c>AddAiEnrichment()</c> registration.
    /// </summary>
    public string? ApiKeySecretName { get; set; }

    /// <summary>
    /// Model identifier passed in the chat-completions request (e.g.
    /// <c>provider:model-name</c>).
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
    /// Request server-sent-event streaming. Keeps tokens flowing for the whole
    /// call, so the gateway's request timeout for non-streaming calls (30 min
    /// on the KI gateway) and any pre-first-token timeouts do not apply.
    /// Recommended on.
    /// </summary>
    public bool UseStreaming { get; set; } = true;

    /// <summary>
    /// Maximum time in seconds to wait for a single chat call. Budget expiry
    /// surfaces as a per-item transport verdict, not a failed task. For
    /// non-streaming calls, keep this below the gateway's own request timeout
    /// so this budget fires first.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 300;
}
