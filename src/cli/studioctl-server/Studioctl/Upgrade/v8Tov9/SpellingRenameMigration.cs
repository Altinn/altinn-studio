using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Renames the v8 Altinn.App API members whose names were misspelled or spelled in British English.
/// v9 standardised on US English for code, so an app referencing the old names no longer compiles.
///
/// Each entry is matched on a whole word, so an app's own identifiers that merely contain one of these
/// as a substring are left alone. Names too generic to match safely are reported instead of rewritten.
/// </summary>
internal static class SpellingRenameMigration
{
    /// <summary>
    /// Old name -> new name. Ordered longest-first when applied, so that a longer name is never
    /// partially rewritten by a shorter one that prefixes it.
    /// </summary>
    private static readonly (string Old, string New)[] _renames =
    [
        // Models
        ("OrganisationNumberJsonConverterAttribute", "OrganizationNumberJsonConverterAttribute"),
        ("OrganisationOrPersonIdentifierJsonConverter", "OrganizationOrPersonIdentifierJsonConverter"),
        ("OrganisationNumberJsonConverter", "OrganizationNumberJsonConverter"),
        ("OrganisationOrPersonIdentifier", "OrganizationOrPersonIdentifier"),
        ("OrganisationNumberExtensions", "OrganizationNumberExtensions"),
        ("OrganisationNumberFormat", "OrganizationNumberFormat"),
        ("OrganisationNumberGuard", "OrganizationNumberGuard"),
        ("OrganisationNumber", "OrganizationNumber"),
        // API responses
        ("SigningAuthorizedOrganisationsResponse", "SigningAuthorizedOrganizationsResponse"),
        ("LookupOrganisationResponse", "LookupOrganizationResponse"),
        ("OrganisationDetails", "OrganizationDetails"),
        // Builders and telemetry
        ("WithOrganisationOrPersonIdentifier", "WithOrganizationOrPersonIdentifier"),
        ("SetOrganisationNumber", "SetOrganizationNumber"),
        ("SetOrganisationName", "SetOrganizationName"),
        // File analysis (#19784)
        ("IFileAnalyserFactory", "IFileAnalyzerFactory"),
        ("FileAnalyserFactory", "FileAnalyzerFactory"),
        ("IFileAnalyser", "IFileAnalyzer"),
        // Instantiation (#19796)
        ("InstansiationInstance", "InstantiationInstance"),
        ("InstansiationNotification", "InstantiationNotification"),
    ];

    /// <summary>
    /// <c>IFileAnalyser.Analyse</c> became <c>IFileAnalyzer.Analyze</c>. "Analyse" on its own is far too
    /// common a word to rewrite blindly, so only a call or declaration directly on the member is matched.
    /// </summary>
    private static readonly Regex _analyseMember = new(
        @"(?<=\.|\bTask<FileAnalysisResult>\s+|\bpublic\s+Task<FileAnalysisResult>\s+)Analyse(?=\s*\()",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    public static async Task<MigrationResult> Migrate(string projectFolder)
    {
        var ordered = _renames.OrderByDescending(r => r.Old.Length).ToArray();
        var patterns = ordered
            .Select(r => (Regex: new Regex($@"\b{Regex.Escape(r.Old)}\b", RegexOptions.CultureInvariant), r.New))
            .ToArray();

        var changedFiles = 0;
        var totalReplacements = 0;
        var perName = new SortedDictionary<string, int>(StringComparer.Ordinal);

        foreach (var file in EnumerateAppCSharpFiles(projectFolder))
        {
            var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(file));
            var text = decoded.Text;
            var updated = text;

            for (var i = 0; i < patterns.Length; i++)
            {
                var (regex, replacement) = patterns[i];
                var count = regex.Matches(updated).Count;
                if (count == 0)
                    continue;
                updated = regex.Replace(updated, replacement);
                perName[ordered[i].Old] = perName.GetValueOrDefault(ordered[i].Old) + count;
                totalReplacements += count;
            }

            var analyseCount = _analyseMember.Matches(updated).Count;
            if (analyseCount > 0)
            {
                updated = _analyseMember.Replace(updated, "Analyze");
                perName["Analyse"] = perName.GetValueOrDefault("Analyse") + analyseCount;
                totalReplacements += analyseCount;
            }

            if (ReferenceEquals(updated, text) || updated == text)
                continue;

            await Utf8TextFile.Write(file, updated, decoded.HadBom);
            changedFiles++;
        }

        if (changedFiles == 0)
        {
            await UpgradeConsole.Out.WriteLineAsync("No renamed v9 API names found in app code");
            return new MigrationResult(false, []);
        }

        foreach (var (name, count) in perName)
        {
            var replacement = name == "Analyse" ? "Analyze" : ordered.First(r => r.Old == name).New;
            await UpgradeConsole.Out.WriteLineAsync($"  {name} -> {replacement} ({count})");
        }
        await UpgradeConsole.Out.WriteLineAsync(
            $"Renamed {totalReplacements} v9 API reference(s) across {changedFiles} file(s)"
        );
        return new MigrationResult(false, []);
    }

    private static IEnumerable<string> EnumerateAppCSharpFiles(string projectFolder)
    {
        foreach (var file in Directory.EnumerateFiles(projectFolder, "*.cs", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(projectFolder, file);
            if (!BuildOutputPaths.IsBuildOutput(relativePath))
                yield return file;
        }
    }
}
