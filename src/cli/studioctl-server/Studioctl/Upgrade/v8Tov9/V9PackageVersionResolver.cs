using System.Diagnostics;
using System.Text.Json;
using Altinn.Studio.StudioctlServer.Platform;
using NuGet.Versioning;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal static class V9PackageVersionResolver
{
    public static async Task<string> ResolveLatestTargetVersion(
        string projectFolder,
        int targetMajorVersion,
        string minimumVersion,
        CancellationToken cancellationToken
    )
    {
        var apiVersions = await SearchPackageVersions("Altinn.App.Api", projectFolder, cancellationToken);
        var coreVersions = await SearchPackageVersions("Altinn.App.Core", projectFolder, cancellationToken);
        return ResolveLatestTargetVersion(apiVersions, coreVersions, targetMajorVersion, minimumVersion);
    }

    internal static string ResolveLatestTargetVersion(
        IReadOnlyCollection<string> apiVersions,
        IReadOnlyCollection<string> coreVersions,
        int targetMajorVersion,
        string minimumVersion
    )
    {
        var coreVersionSet = coreVersions.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return SelectLatestVersion(
                apiVersions.Where(coreVersionSet.Contains),
                targetMajorVersion,
                NuGetVersion.Parse(minimumVersion)
            )
            ?? throw new InvalidOperationException(
                $"Could not find a common Altinn.App.Api/Altinn.App.Core version with major version {targetMajorVersion} "
                    + $"at least {minimumVersion} in the configured NuGet package sources."
            );
    }

    /// <summary>
    /// The latest version of <paramref name="packageId"/> in the app's NuGet sources with major version
    /// <paramref name="targetMajorVersion"/> and at least <paramref name="minimumVersion"/>, or null when there is none.
    /// </summary>
    public static async Task<string?> ResolveLatestVersion(
        string packageId,
        string projectFolder,
        int targetMajorVersion,
        NuGetVersion minimumVersion,
        CancellationToken cancellationToken
    )
    {
        var versions = await SearchPackageVersions(packageId, projectFolder, cancellationToken);
        return SelectLatestVersion(versions, targetMajorVersion, minimumVersion);
    }

    /// <summary>Prefers a stable version over a prerelease, then the highest.</summary>
    internal static string? SelectLatestVersion(
        IEnumerable<string> versions,
        int targetMajorVersion,
        NuGetVersion minimumVersion
    )
    {
        var latest = versions
            .Select(value => NuGetVersion.TryParse(value, out var version) ? version : null)
            .OfType<NuGetVersion>()
            .Where(v => v.Major == targetMajorVersion && v >= minimumVersion)
            .OrderBy(v => v.IsPrerelease)
            .ThenByDescending(v => v)
            .FirstOrDefault();

        return latest is null ? null : latest.OriginalVersion ?? latest.ToNormalizedString();
    }

    private static async Task<IReadOnlyList<string>> SearchPackageVersions(
        string packageId,
        string projectFolder,
        CancellationToken cancellationToken
    )
    {
        var startInfo = ProcessUtil.CreateDotnetStartInfo(
            "package",
            "search",
            packageId,
            "--exact-match",
            "--prerelease",
            "--format",
            "json"
        );
        startInfo.WorkingDirectory = projectFolder;
        startInfo.RedirectStandardOutput = true;
        startInfo.RedirectStandardError = true;

        using var process =
            Process.Start(startInfo) ?? throw new InvalidOperationException("Failed to start dotnet package search.");
        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);
        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException(
                $"dotnet package search failed for {packageId} with exit code {process.ExitCode}: {stderr.Trim()}"
            );
        }

        return ParsePackageSearchResult(stdout, packageId);
    }

    internal static IReadOnlyList<string> ParsePackageSearchResult(string json, string packageId)
    {
        using var document = JsonDocument.Parse(json);
        if (!document.RootElement.TryGetProperty("searchResult", out var searchResult))
        {
            throw new InvalidOperationException($"Could not parse dotnet package search output for {packageId}.");
        }

        var versions = new List<string>();
        foreach (var source in searchResult.EnumerateArray())
        {
            if (!source.TryGetProperty("packages", out var packages))
                continue;

            foreach (var package in packages.EnumerateArray())
            {
                if (
                    package.TryGetProperty("id", out var id)
                    && package.TryGetProperty("version", out var version)
                    && string.Equals(id.GetString(), packageId, StringComparison.OrdinalIgnoreCase)
                    && version.GetString() is { } versionValue
                )
                {
                    versions.Add(versionValue);
                }
            }
        }

        return versions.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }
}
