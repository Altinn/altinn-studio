using System.Collections.Generic;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Result of whitespace restoration operation
/// </summary>
internal class WhitespaceRestorationResult
{
    public bool Success { get; set; }
    public int TotalFilesProcessed { get; set; }
    public int TotalHunksAnalyzed { get; set; }
    public int WhitespaceOnlyHunksFound { get; set; }
    public int HunksReverted { get; set; }
    public List<string> Errors { get; set; } = new List<string>();
    public List<string> Warnings { get; set; } = new List<string>();
}
