using Altinn.Studio.Cli.Upgrade.ProjectFile;
using NuGet.Versioning;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Moves Altinn.Codelists and Altinn.FileAnalyzers to their latest v9 release. Each release of them is built
/// against one version of Altinn.App.Core and implements its interfaces, so a release built against v8 fails when
/// the app runs v9. Restore does not notice: their v8 releases accept any Altinn.App.Core from 8.0.0 up.
/// </summary>
internal sealed class CompanionPackageMigration
{
    /// <summary>Each package, and its first release that works with the Altinn.App version the upgrade sets.</summary>
    internal static readonly IReadOnlyList<(string Id, NuGetVersion Minimum)> Packages =
    [
        // 9.0.0-preview.1 implements IAppOptionsProvider as it was before Altinn.App.Core 9.0.0-preview.8.
        ("Altinn.Codelists", NuGetVersion.Parse("9.0.0-preview.2")),
        ("Altinn.FileAnalyzers", NuGetVersion.Parse("9.0.0-preview.1")),
    ];

    private readonly string _projectFile;
    private readonly int _targetMajorVersion;
    private readonly Func<string, NuGetVersion, CancellationToken, Task<string?>> _resolveLatestVersion;

    /// <param name="projectFile">The app's project file.</param>
    /// <param name="targetMajorVersion">The major version to move the packages to.</param>
    /// <param name="resolveLatestVersion">
    /// The latest release of a package with <paramref name="targetMajorVersion"/> and at least the given version, or
    /// null when the app's NuGet sources have none.
    /// </param>
    public CompanionPackageMigration(
        string projectFile,
        int targetMajorVersion,
        Func<string, NuGetVersion, CancellationToken, Task<string?>> resolveLatestVersion
    )
    {
        _projectFile = projectFile;
        _targetMajorVersion = targetMajorVersion;
        _resolveLatestVersion = resolveLatestVersion;
    }

    public async Task<MigrationResult> MigrateAsync(CancellationToken cancellationToken)
    {
        var messages = new List<UpgradeMessage>();
        var checks = new ProjectChecks.ProjectChecks(_projectFile);
        var projectFileName = Path.GetFileName(_projectFile);
        var rewriter = new ProjectFileRewriter(_projectFile);
        foreach (var (id, minimum) in Packages)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var own = checks.PackageReferenceVersions(id);
            var inherited = checks.InheritedPackageReferenceVersions(id);
            var outdated = own.OfType<string>().Where(version => Classify(version, minimum) == State.Outdated).ToList();
            var unreadable = own.Any(version => Classify(version, minimum) == State.Unreadable);
            var outdatedInherited = inherited.Any(version => Classify(version, minimum) != State.Current);
            if (outdated.Count == 0 && !unreadable && !outdatedInherited)
            {
                foreach (var version in own.Concat(inherited).OfType<string>().Distinct(StringComparer.Ordinal))
                    messages.Add(new UpgradeMessage($"{id} is already on {version}", UpgradeMessageStatus.Skip));
                continue;
            }

            var latest = await _resolveLatestVersion(id, minimum, cancellationToken);
            var target = latest ?? $"{minimum} or later";
            var reason = $"Releases before {minimum} do not work with Altinn.App v{_targetMajorVersion}.";
            if (outdated.Count > 0 && latest is not null)
            {
                var replaced = await rewriter.ReplacePackageReferenceVersions(
                    id,
                    latest,
                    version => Classify(version, minimum) == State.Outdated,
                    cancellationToken
                );
                messages.Ok(
                    $"{id} moved from {string.Join(", ", replaced.Distinct(StringComparer.Ordinal))} to {latest}"
                );
            }
            else if (outdated.Count > 0)
            {
                messages.Todo(
                    $"Move {id} from {string.Join(", ", outdated.Distinct(StringComparer.Ordinal))} to {target}. "
                        + $"The app's NuGet sources have no such release. {reason}"
                );
            }

            if (unreadable)
                messages.Todo(
                    $"Make sure {id} resolves to {target}: the upgrade cannot tell which version {projectFileName} gives it. {reason}"
                );

            if (outdatedInherited)
                messages.Todo($"Set {id} to {target} in Directory.Build.props. {reason}");
        }

        return new MigrationResult(messages);
    }

    private enum State
    {
        Current,
        Outdated,
        Unreadable,
    }

    /// <summary>
    /// A version range resolves to its lower bound, or to the latest release for a floating version. Either way, a
    /// lower bound at <paramref name="minimum"/> or later never resolves to a release that does not work.
    /// </summary>
    private static State Classify(string? version, NuGetVersion minimum)
    {
        if (version is null || !VersionRange.TryParse(version, out var range))
            return State.Unreadable;

        return range.MinVersion is { } lowerBound && lowerBound >= minimum ? State.Current : State.Outdated;
    }
}
