using System.Text.RegularExpressions;
using Altinn.Studio.Cli.Upgrade.ProjectFile;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Auto-migration for the explicit package version floors a v9 app requires. Bumping Altinn.App.* to
/// v9 raises the floors of some transitive dependencies (e.g. Azure.Identity, Azure.Extensions...
/// Secrets); an app that pins those lower via an explicit <c>PackageReference</c> then fails to restore
/// with NU1605 ("Detected package downgrade"). Rather than hard-code a list that will drift, this runs
/// <c>dotnet restore</c>, parses the reported downgrades, and raises the offending explicit references
/// to the required floor - repeating until restore is clean or no further progress is possible.
/// </summary>
internal sealed class NuGetDowngradeResolver
{
    // A restore normally reports every downgrade at once, but raising one floor can surface another,
    // so we iterate a few times. Termination is also guaranteed by the "attempted" set below.
    private const int MaxIterations = 5;

    private static readonly Regex _downgradePattern = new(
        @"Detected package downgrade:\s+(?<id>\S+)\s+from\s+(?<from>\S+)\s+to\s+(?<to>\S+)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    /// <param name="projectFolder">Working directory for <c>dotnet restore</c>.</param>
    /// <param name="projectFile">The app's project file to rewrite.</param>
    public async Task<MigrationResult> ResolveAsync(
        string projectFolder,
        string projectFile,
        CancellationToken cancellationToken
    )
    {
        var messages = new List<UpgradeMessage>();

        // Guards against re-processing the same "id@version" downgrade forever (e.g. a downgrade for a
        // package with no explicit reference, which restore keeps reporting after we warn about it).
        var attempted = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var iteration = 0; iteration < MaxIterations; iteration++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            // NU1605 makes restore exit non-zero; we don't treat that as fatal - the downgrade text is what
            // we're after, and it appears on stdout/stderr regardless of exit code.
            var restoreOutput = await DotnetRestore.RunAsync(
                projectFolder,
                projectFile,
                configuration: null,
                cancellationToken
            );
            var downgrades = ParseDowngrades(restoreOutput.Output);

            var pending = downgrades.Where(d => attempted.Add($"{d.PackageId}@{d.RequiredVersion}")).ToList();
            if (pending.Count == 0)
            {
                // An SDK, network or project error is not a successful downgrade check. Report the
                // failed restore too, so an upgrade cannot quietly claim the dependency graph is clean.
                if (restoreOutput.ExitCode != 0)
                {
                    var error = DotnetRestore.FindError(restoreOutput.Output);
                    messages.Todo(
                        $"Could not complete dotnet restore (exit code {restoreOutput.ExitCode})"
                            + (error is null ? "." : $": {error}")
                    );
                }
                break;
            }

            // Last-wins if a package appears twice; restore reports a single required floor per package.
            var floors = pending
                .GroupBy(d => d.PackageId, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.Last().RequiredVersion, StringComparer.OrdinalIgnoreCase);

            var rewriter = new ProjectFileRewriter(projectFile);
            var updated = await rewriter.SetPackageReferenceVersions(floors);

            foreach (var (packageId, version) in floors)
            {
                if (updated.Contains(packageId))
                {
                    messages.Warn($"Raised {packageId} to {version} to satisfy the v9 dependency floor.");
                }
                else
                {
                    messages.Todo(
                        $"{packageId} is resolved below the v9 floor {version} but has no explicit "
                            + $"PackageReference to raise. Add <PackageReference Include=\"{packageId}\" "
                            + $"Version=\"{version}\" /> manually."
                    );
                }
            }
        }

        return new MigrationResult(messages);
    }

    /// <summary>Parses NU1605 "Detected package downgrade: X from A to B" lines from restore output.</summary>
    internal static IReadOnlyList<PackageDowngrade> ParseDowngrades(string output)
    {
        var downgrades = new List<PackageDowngrade>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match match in _downgradePattern.Matches(output))
        {
            var id = match.Groups["id"].Value;
            var required = match.Groups["from"].Value;
            var current = match.Groups["to"].Value;
            if (seen.Add($"{id}@{required}"))
            {
                downgrades.Add(new PackageDowngrade(id, required, current));
            }
        }

        return downgrades;
    }

    /// <param name="PackageId">The package with a downgrade.</param>
    /// <param name="RequiredVersion">The floor required by the dependency graph (the "from" version).</param>
    /// <param name="CurrentVersion">The lower version the explicit reference currently resolves to.</param>
    internal readonly record struct PackageDowngrade(string PackageId, string RequiredVersion, string CurrentVersion);
}
