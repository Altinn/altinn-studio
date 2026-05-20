using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Services.Agent.Orchestration;

/// <summary>
/// Reads <c>system-prompt.md</c> from <see cref="ContentPathsOptions.OrchestratorRoot"/>
/// once at first access and caches it for the process lifetime. A missing file
/// throws on startup so a misconfigured deployment fails fast rather than
/// sending an empty system prompt to the model.
/// </summary>
public sealed class FileSystemPromptProvider(IOptions<ContentPathsOptions> contentPaths) : ISystemPromptProvider
{
    private const string PromptFilename = "system-prompt.md";
    private string? _cached;

    public string GetSystemPrompt()
    {
        if (_cached is not null)
            return _cached;

        var path = Path.Combine(contentPaths.Value.OrchestratorRoot, PromptFilename);
        if (!File.Exists(path))
        {
            throw new InvalidOperationException(
                $"Required file not found: {path}. " +
                $"Mount your orchestrator config (containing {PromptFilename}) at " +
                $"{contentPaths.Value.OrchestratorRoot} — the image ships no default system prompt.");
        }

        _cached = File.ReadAllText(path);
        return _cached;
    }
}
