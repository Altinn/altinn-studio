namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Shared shaping for the warn-only C# API detectors: a v9 break that cannot be transformed safely is
/// reported (never rewritten). Given the matched usages and a guidance summary, this produces a
/// <see cref="MigrationResult"/> that flags <see cref="MigrationResult.ManualActionRequired"/> when
/// anything matched, with a leading summary line followed by one sorted, de-duplicated line per usage.
/// When nothing matched it returns a clean, no-action result.
/// </summary>
internal static class WarnOnlyDetector
{
    public static MigrationResult Report(string summary, IEnumerable<CSharpApiMatch> matches)
    {
        var distinct = matches
            .Distinct()
            .OrderBy(static match => match.RelativePath, StringComparer.Ordinal)
            .ThenBy(static match => match.Line)
            .ThenBy(static match => match.Symbol, StringComparer.Ordinal)
            .ToList();

        if (distinct.Count == 0)
        {
            return new MigrationResult(ManualActionRequired: false, Array.Empty<string>());
        }

        var warnings = new List<string>(distinct.Count + 1) { summary };
        warnings.AddRange(distinct.Select(static match => $"{match.Location}: {match.Symbol}"));
        return new MigrationResult(ManualActionRequired: true, warnings);
    }

    /// <summary>
    /// Combines several results (e.g. when one detector reports on distinct concerns with different
    /// guidance): warnings are concatenated in order and <see cref="MigrationResult.ManualActionRequired"/>
    /// is set if any input set it.
    /// </summary>
    public static MigrationResult Combine(params MigrationResult[] results)
    {
        var warnings = results.SelectMany(static result => result.Warnings).ToList();
        var manualActionRequired = Array.Exists(results, static result => result.ManualActionRequired);
        return new MigrationResult(manualActionRequired, warnings);
    }
}
