namespace Altinn.App.Ai.Enrichment.Configuration;

/// <summary>Options for the external Typst PDF renderer.</summary>
public sealed class TypstOptions
{
    public const string SectionName = "AiEnrichment:Typst";

    /// <summary>Path to the typst binary. Defaults to <c>typst</c> on PATH.</summary>
    public string BinaryPath { get; set; } = "typst";

    /// <summary>Hard cap on a single typst compile invocation.</summary>
    public int ProcessTimeoutSeconds { get; set; } = 60;
}
