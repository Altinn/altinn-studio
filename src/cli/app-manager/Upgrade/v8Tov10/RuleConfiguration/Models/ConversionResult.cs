namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.Models;

/// <summary>
/// Result of attempting to convert a JavaScript rule function to an expression
/// </summary>
public class ConversionResult
{
    /// <summary>
    /// Whether conversion was successful
    /// </summary>
    public ConversionStatus Status { get; set; }

    /// <summary>
    /// The generated expression as a nested array/object structure
    /// Will be serialized to JSON for output
    /// </summary>
    public object? Expression { get; set; }

    /// <summary>
    /// Detailed debug information about the conversion process
    /// </summary>
    public List<string> DebugInfo { get; set; } = new();

    /// <summary>
    /// Warnings about the conversion (e.g., potential edge cases)
    /// </summary>
    public List<string> Warnings { get; set; } = new();

    /// <summary>
    /// Primary reason for failure or reduced confidence
    /// </summary>
    public string? FailureReason { get; set; }

    /// <summary>
    /// The original JavaScript code that was analyzed
    /// </summary>
    public string OriginalJavaScript { get; set; } = string.Empty;

    /// <summary>
    /// Whether the expression was inverted due to "Show" action
    /// </summary>
    public bool WasInverted { get; set; }

    /// <summary>
    /// Whether the conversion requires environment settings to be added to the app
    /// This is set when window.location checks are converted to frontendSettings
    /// </summary>
    public bool RequiresEnvironmentSettings { get; set; }
}

public enum ConversionStatus
{
    /// <summary>
    /// Successfully converted to expression
    /// </summary>
    Success,

    /// <summary>
    /// Could not convert automatically
    /// </summary>
    Failed,
}
