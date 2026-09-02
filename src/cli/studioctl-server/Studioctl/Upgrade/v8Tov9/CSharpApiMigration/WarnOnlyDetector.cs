namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Shared shaping for the warn-only C# API detectors: a v9 break that cannot be transformed safely is
/// reported (never rewritten). Given the matched usages and a guidance summary, this produces a
/// <see cref="MigrationResult"/> holding the summary - a to-do from <see cref="Report"/>, a warning from
/// <see cref="Advise"/> - followed by one sorted, de-duplicated warning per usage. When nothing matched
/// it returns a clean, no-action result.
/// </summary>
internal static class WarnOnlyDetector
{
    public static MigrationResult Report(string summary, IEnumerable<CSharpApiMatch> matches) =>
        Build(summary, matches, UpgradeMessageStatus.Todo);

    /// <summary>
    /// Like <see cref="Report"/>, but purely informational: the matched usages still compile and run, so
    /// the app is not blocked and the result carries no to-do. Use this for a nudge towards a better API -
    /// a working app must not be given an exit code that says "needs manual follow-up" merely for being
    /// old-fashioned.
    /// </summary>
    public static MigrationResult Advise(string summary, IEnumerable<CSharpApiMatch> matches) =>
        Build(summary, matches, UpgradeMessageStatus.Warning);

    private static MigrationResult Build(
        string summary,
        IEnumerable<CSharpApiMatch> matches,
        UpgradeMessageStatus summaryKind
    )
    {
        var distinct = matches
            .Distinct()
            .OrderBy(static match => match.RelativePath, StringComparer.Ordinal)
            .ThenBy(static match => match.Line)
            .ThenBy(static match => match.Symbol, StringComparer.Ordinal)
            .ToList();

        if (distinct.Count == 0)
        {
            return new MigrationResult();
        }

        var messages = new List<UpgradeMessage>(distinct.Count + 1) { new(summary, summaryKind) };
        messages.WarnRange(distinct.Select(static match => $"{match.Location}: {match.Symbol}"));
        return new MigrationResult(messages);
    }

    /// <summary>
    /// Combines several results (e.g. when one detector reports on distinct concerns with different
    /// guidance)
    /// </summary>
    public static MigrationResult Combine(params MigrationResult[] results) =>
        new([.. results.SelectMany(static result => result.Messages)]);
}
