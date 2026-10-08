namespace Altinn.App.Ai.Enrichment.Orchestration;

/// <summary>
/// Supplies the orchestrator's system prompt. Splitting it out of
/// <see cref="ChecklistOrchestrator"/> keeps domain-specific text (status
/// vocabulary, role framing) in <c>config/orchestrator/system-prompt.md</c>
/// rather than baked into the image.
/// </summary>
public interface ISystemPromptProvider
{
    string GetSystemPrompt();
}
