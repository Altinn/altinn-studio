namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Result of CSS customization detection
/// </summary>
internal sealed record CustomCssResult
{
    /// <summary>
    /// Whether custom CSS was detected
    /// </summary>
    public bool HasCustomCss => InlineStyles.Count > 0 || ExternalStylesheets.Count > 0;

    /// <summary>
    /// Inline CSS content blocks from &lt;style&gt; tags
    /// </summary>
    public List<string> InlineStyles { get; init; } = [];

    /// <summary>
    /// External stylesheet URLs from &lt;link&gt; tags
    /// </summary>
    public List<string> ExternalStylesheets { get; init; } = [];
}

/// <summary>
/// Result of JavaScript customization detection
/// </summary>
internal sealed record CustomJavaScriptResult
{
    /// <summary>
    /// Whether custom JavaScript was detected
    /// </summary>
    public bool HasCustomJavaScript => InlineScripts.Count > 0 || ExternalScripts.Count > 0;

    /// <summary>
    /// Inline JavaScript content blocks from &lt;script&gt; tags
    /// </summary>
    public List<string> InlineScripts { get; init; } = [];

    /// <summary>
    /// External script URLs from &lt;script src&gt; tags
    /// </summary>
    public List<string> ExternalScripts { get; init; } = [];
}

/// <summary>
/// Result of custom frontend detection
/// </summary>
internal sealed record CustomFrontendResult
{
    /// <summary>
    /// Whether a custom frontend was detected (absence of standard Altinn app-frontend scripts)
    /// </summary>
    public bool IsCustomFrontend { get; init; }
}

/// <summary>
/// Main result of Index.cshtml analysis
/// </summary>
internal sealed record IndexAnalysisResult
{
    /// <summary>
    /// Whether the analysis was successful
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// Path to the analyzed file
    /// </summary>
    public string FilePath { get; init; } = string.Empty;

    /// <summary>
    /// List of warnings from analysis
    /// </summary>
    public List<string> Warnings { get; init; } = [];

    /// <summary>
    /// CSS customization results
    /// </summary>
    public CustomCssResult CustomCss { get; init; } = new();

    /// <summary>
    /// JavaScript customization results
    /// </summary>
    public CustomJavaScriptResult CustomJavaScript { get; init; } = new();

    /// <summary>
    /// Custom frontend detection result
    /// </summary>
    public CustomFrontendResult CustomFrontend { get; init; } = new();

    /// <summary>
    /// Creates a successful analysis result
    /// </summary>
    public static IndexAnalysisResult Successful(
        string filePath,
        CustomCssResult customCss,
        CustomJavaScriptResult customJavaScript,
        CustomFrontendResult customFrontend,
        List<string> warnings
    )
    {
        return new IndexAnalysisResult
        {
            Success = true,
            FilePath = filePath,
            CustomCss = customCss,
            CustomJavaScript = customJavaScript,
            CustomFrontend = customFrontend,
            Warnings = warnings,
        };
    }
}
