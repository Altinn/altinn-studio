using System.Text;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Decides whether migration can proceed and generates reports
/// </summary>
internal sealed class MigrationDecisionEngine
{
    /// <summary>
    /// Makes a migration decision based on categorization results
    /// </summary>
    /// <param name="result">The categorization result</param>
    /// <returns>Migration decision with report</returns>
    public MigrationDecision Decide(CategorizationResult result)
    {
        var report = GenerateReport(result);

        return new MigrationDecision { CanProceed = result.IsSafeToMigrate, Report = report };
    }

    private MigrationReport GenerateReport(CategorizationResult result)
    {
        var summary = new ReportSummary
        {
            ExpectedCount = result.ExpectedElements.Count,
            KnownCustomizationCount = result.KnownCustomizations.Count,
            UnexpectedCount = result.UnexpectedElements.Count,
            IsSafeToMigrate = result.IsSafeToMigrate,
        };

        string? customizationsSection = null;
        if (result.HasCustomizations)
        {
            customizationsSection = GenerateCustomizationsSection(result);
        }

        string? unexpectedSection = null;
        string? blockingReason = null;
        if (result.UnexpectedElements.Count > 0)
        {
            unexpectedSection = GenerateUnexpectedSection(result);
            blockingReason =
                $"Found {result.UnexpectedElements.Count} unexpected element(s) that cannot be automatically migrated";
        }

        return new MigrationReport
        {
            Summary = summary,
            CustomizationsSection = customizationsSection,
            UnexpectedSection = unexpectedSection,
            BlockingReason = blockingReason,
        };
    }

    private string GenerateCustomizationsSection(CategorizationResult result)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Known Customizations (will be migrated):");
        sb.AppendLine();

        // Group by type
        var externalCss = result
            .KnownCustomizations.Where(c => c.CustomizationType == CustomizationType.ExternalStylesheet)
            .ToList();
        var externalJs = result
            .KnownCustomizations.Where(c => c.CustomizationType == CustomizationType.ExternalScript)
            .ToList();
        var inlineCss = result
            .KnownCustomizations.Where(c => c.CustomizationType == CustomizationType.InlineStylesheet)
            .ToList();
        var inlineJs = result
            .KnownCustomizations.Where(c => c.CustomizationType == CustomizationType.InlineScript)
            .ToList();

        if (externalCss.Count > 0)
        {
            sb.AppendLine($"  External Stylesheets ({externalCss.Count}):");
            foreach (var item in externalCss)
            {
                sb.AppendLine($"    • {item.ExtractionHint}");
                sb.AppendLine("      → Will be added to frontend.json");
            }
            sb.AppendLine();
        }

        if (externalJs.Count > 0)
        {
            sb.AppendLine($"  External Scripts ({externalJs.Count}):");
            foreach (var item in externalJs)
            {
                sb.AppendLine($"    • {item.ExtractionHint}");
                sb.AppendLine("      → Will be added to frontend.json");
            }
            sb.AppendLine();
        }

        if (inlineCss.Count > 0)
        {
            sb.AppendLine($"  Inline Styles ({inlineCss.Count}):");
            foreach (var item in inlineCss)
            {
                sb.AppendLine($"    • {item.Description}");
                sb.AppendLine("      → Will be extracted to /App/wwwroot/custom-css/");
            }
            sb.AppendLine();
        }

        if (inlineJs.Count > 0)
        {
            sb.AppendLine($"  Inline Scripts ({inlineJs.Count}):");
            foreach (var item in inlineJs)
            {
                sb.AppendLine($"    • {item.Description}");
                sb.AppendLine("      → Will be extracted to /App/wwwroot/custom-js/");
            }
            sb.AppendLine();
        }

        return sb.ToString();
    }

    private string GenerateUnexpectedSection(CategorizationResult result)
    {
        var sb = new StringBuilder();
        sb.AppendLine("UNEXPECTED ELEMENTS (blocking migration):");
        sb.AppendLine();

        foreach (var item in result.UnexpectedElements)
        {
            sb.AppendLine($"  ✗ <{item.TagName}>");
            sb.AppendLine($"    Location: {item.Location}");
            sb.AppendLine($"    Reason: {item.Reason}");
            sb.AppendLine($"    HTML: {item.OuterHtml}");
            sb.AppendLine();
        }

        sb.AppendLine("Migration is BLOCKED. Options:");
        sb.AppendLine("  1. Remove unexpected elements from Index.cshtml");
        sb.AppendLine("  2. Report to CLI maintainers if these elements should be recognized");
        sb.AppendLine("  3. Manually migrate Index.cshtml to frontend.json");
        sb.AppendLine();

        return sb.ToString();
    }
}

/// <summary>
/// Decision about whether migration can proceed
/// </summary>
internal sealed record MigrationDecision
{
    /// <summary>
    /// Whether migration can safely proceed
    /// </summary>
    public required bool CanProceed { get; init; }

    /// <summary>
    /// Report with details
    /// </summary>
    public required MigrationReport Report { get; init; }
}

/// <summary>
/// Detailed report about the migration analysis
/// </summary>
internal sealed record MigrationReport
{
    /// <summary>
    /// Summary statistics
    /// </summary>
    public required ReportSummary Summary { get; init; }

    /// <summary>
    /// Section describing customizations (if any)
    /// </summary>
    public string? CustomizationsSection { get; init; }

    /// <summary>
    /// Section describing unexpected elements (if any)
    /// </summary>
    public string? UnexpectedSection { get; init; }

    /// <summary>
    /// Reason migration is blocked (if blocked)
    /// </summary>
    public string? BlockingReason { get; init; }
}

/// <summary>
/// Summary statistics for the report
/// </summary>
internal sealed record ReportSummary
{
    /// <summary>
    /// Number of expected framework elements
    /// </summary>
    public required int ExpectedCount { get; init; }

    /// <summary>
    /// Number of known customizations
    /// </summary>
    public required int KnownCustomizationCount { get; init; }

    /// <summary>
    /// Number of unexpected elements
    /// </summary>
    public required int UnexpectedCount { get; init; }

    /// <summary>
    /// Whether migration can safely proceed
    /// </summary>
    public required bool IsSafeToMigrate { get; init; }
}
