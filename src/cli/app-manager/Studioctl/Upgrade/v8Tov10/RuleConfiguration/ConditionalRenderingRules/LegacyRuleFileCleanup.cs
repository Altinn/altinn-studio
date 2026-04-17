namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Cleanup job that removes legacy rule files after conversion
/// </summary>
internal sealed class LegacyRuleFileCleanup
{
    private readonly string _appBasePath;

    public LegacyRuleFileCleanup(string appBasePath)
    {
        _appBasePath = appBasePath;
    }

    /// <summary>
    /// Remove legacy rule files from all layout sets
    /// </summary>
    public CleanupStatistics CleanupAllLayoutSets()
    {
        var stats = new CleanupStatistics();

        var uiPath = Path.Combine(_appBasePath, "App", "ui");
        if (!Directory.Exists(uiPath))
        {
            // Try alternative path without App/ prefix
            uiPath = Path.Combine(_appBasePath, "ui");
            if (!Directory.Exists(uiPath))
            {
                return stats; // No UI directory
            }
        }

        // Enumerate all layout sets (subdirectories in ui/)
        var layoutSetDirectories = Directory.GetDirectories(uiPath);

        foreach (var layoutSetPath in layoutSetDirectories)
        {
            var layoutSetName = Path.GetFileName(layoutSetPath);

            try
            {
                var result = CleanupLayoutSet(layoutSetPath, layoutSetName);
                stats.TotalLayoutSets++;
                stats.RuleConfigFilesDeleted += result.RuleConfigDeleted ? 1 : 0;
                stats.RuleHandlerFilesDeleted += result.RuleHandlerDeleted ? 1 : 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error cleaning up layout set {layoutSetName}: {ex.Message}");
            }
        }

        return stats;
    }

    /// <summary>
    /// Remove legacy rule files from a single layout set
    /// </summary>
    private LayoutSetCleanupResult CleanupLayoutSet(string layoutSetPath, string layoutSetName)
    {
        var result = new LayoutSetCleanupResult { LayoutSetName = layoutSetName };

        // Delete RuleConfiguration.json if it exists
        var ruleConfigPath = Path.Combine(layoutSetPath, "RuleConfiguration.json");
        if (File.Exists(ruleConfigPath))
        {
            try
            {
                File.Delete(ruleConfigPath);
                result.RuleConfigDeleted = true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Failed to delete RuleConfiguration.json in {layoutSetName}: {ex.Message}");
            }
        }

        // Delete RuleHandler.js if it exists
        var ruleHandlerPath = Path.Combine(layoutSetPath, "RuleHandler.js");
        if (File.Exists(ruleHandlerPath))
        {
            try
            {
                File.Delete(ruleHandlerPath);
                result.RuleHandlerDeleted = true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Failed to delete RuleHandler.js in {layoutSetName}: {ex.Message}");
            }
        }

        return result;
    }
}

/// <summary>
/// Statistics for the cleanup process
/// </summary>
internal sealed class CleanupStatistics
{
    public int TotalLayoutSets { get; set; }
    public int RuleConfigFilesDeleted { get; set; }
    public int RuleHandlerFilesDeleted { get; set; }
}

/// <summary>
/// Result of cleaning up a single layout set
/// </summary>
internal sealed class LayoutSetCleanupResult
{
    public string LayoutSetName { get; set; } = string.Empty;
    public bool RuleConfigDeleted { get; set; }
    public bool RuleHandlerDeleted { get; set; }
}
