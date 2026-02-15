namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Result of whitespace restoration operation
/// </summary>
internal sealed class WhitespaceRestorationResult
{
    public bool Success { get; set; }
    public int TotalFilesProcessed { get; set; }
    public int TotalHunksAnalyzed { get; set; }
    public int WhitespaceOnlyHunksFound { get; set; }
    public int HunksReverted { get; set; }
    public List<string> Errors { get; set; } = new List<string>();
    public List<string> Warnings { get; set; } = new List<string>();
}
