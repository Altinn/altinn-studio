namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.Models;

/// <summary>
/// Represents a JavaScript function extracted from RuleHandler.js
/// </summary>
public class JavaScriptFunction
{
    /// <summary>
    /// Function name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Full function implementation as string (including function signature)
    /// </summary>
    public string Implementation { get; set; } = string.Empty;

    /// <summary>
    /// Parameter name from function signature (usually 'obj')
    /// </summary>
    public string ParameterName { get; set; } = string.Empty;
}
