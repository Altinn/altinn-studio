namespace Altinn.App.Ai.Enrichment.Orchestration;

/// <summary>
/// Reads the system prompt from a markdown file once at first access and caches
/// it for the provider's lifetime. A missing file throws so a misconfigured
/// agent folder fails fast rather than sending an empty system prompt to the model.
/// </summary>
public sealed class FileSystemPromptProvider(string promptFilePath) : ISystemPromptProvider
{
    private string? _cached;

    public string GetSystemPrompt()
    {
        if (_cached is not null)
            return _cached;

        if (!File.Exists(promptFilePath))
        {
            throw new InvalidOperationException(
                $"Required file not found: {promptFilePath}. " +
                $"Every agent folder must contain a system-prompt.md — the library ships no default system prompt.");
        }

        _cached = File.ReadAllText(promptFilePath);
        return _cached;
    }
}
