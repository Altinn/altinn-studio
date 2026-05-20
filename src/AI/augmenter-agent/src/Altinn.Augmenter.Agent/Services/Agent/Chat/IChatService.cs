namespace Altinn.Augmenter.Agent.Services.Agent.Chat;

/// <summary>
/// Low-level chat-completions client with tool-calling support. Distinct from
/// <see cref="IAgentService"/> (which runs a packaged skill end-to-end and
/// returns a single string). <see cref="IChatService"/> exposes the raw
/// per-turn primitive used by the per-punkt orchestrator.
/// </summary>
public interface IChatService
{
    Task<ChatResponse> RunAsync(ChatRequest request, CancellationToken cancellationToken = default);
}
