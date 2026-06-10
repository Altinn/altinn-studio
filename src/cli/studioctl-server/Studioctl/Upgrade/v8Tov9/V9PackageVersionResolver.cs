using System.Diagnostics;
using System.Text.Json;
using Altinn.Studio.StudioctlServer.Platform;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal static class V9PackageVersionResolver
{
    public static async Task<string> ResolveLatestTargetVersion(
        string projectFolder,
        int targetMajorVersion,
        CancellationToken cancellationToken
    )
    {
        var apiVersions = await SearchPackageVersions("Altinn.App.Api", projectFolder, cancellationToken);
        var coreVersions = await SearchPackageVersions("Altinn.App.Core", projectFolder, cancellationToken);
        return ResolveLatestTargetVersion(apiVersions, coreVersions, targetMajorVersion);
    }

    internal static string ResolveLatestTargetVersion(
        IReadOnlyCollection<string> apiVersions,
        IReadOnlyCollection<string> coreVersions,
        int targetMajorVersion
    )
    {
        var coreVersionSet = coreVersions.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var latest = apiVersions
            .Where(coreVersionSet.Contains)
            .Select(NuGetPackageVersion.TryParse)
            .OfType<NuGetPackageVersion>()
            .Where(v => v.Major == targetMajorVersion)
            .OrderDescending()
            .FirstOrDefault();

        if (latest is null)
        {
            throw new InvalidOperationException(
                $"Could not find a common Altinn.App.Api/Altinn.App.Core version with major version {targetMajorVersion} "
                    + "in the configured NuGet package sources."
            );
        }

        return latest.Original;
    }

    private static async Task<IReadOnlyList<string>> SearchPackageVersions(
        string packageId,
        string projectFolder,
        CancellationToken cancellationToken
    )
    {
        var startInfo = ProcessUtil.CreateStartInfo(
            "dotnet",
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

    private sealed record NuGetPackageVersion(
        string Original,
        int Major,
        int Minor,
        int Patch,
        IReadOnlyList<string> Prerelease
    ) : IComparable<NuGetPackageVersion>
    {
        public static NuGetPackageVersion? TryParse(string value)
        {
            var versionAndMetadata = value.Split('+', 2)[0];
            var versionParts = versionAndMetadata.Split('-', 2);
            var numericParts = versionParts[0].Split('.');
            if (
                numericParts.Length < 3
                || !int.TryParse(numericParts[0], out var major)
                || !int.TryParse(numericParts[1], out var minor)
                || !int.TryParse(numericParts[2], out var patch)
            )
            {
                return null;
            }

            var prerelease =
                versionParts.Length == 2 ? versionParts[1].Split('.', StringSplitOptions.RemoveEmptyEntries) : [];

            return new NuGetPackageVersion(value, major, minor, patch, prerelease);
        }

        public int CompareTo(NuGetPackageVersion? other)
        {
            if (other is null)
                return 1;

            var numericComparison = Major.CompareTo(other.Major);
            if (numericComparison != 0)
                return numericComparison;

            numericComparison = Minor.CompareTo(other.Minor);
            if (numericComparison != 0)
                return numericComparison;

            numericComparison = Patch.CompareTo(other.Patch);
            if (numericComparison != 0)
                return numericComparison;

            return ComparePrerelease(Prerelease, other.Prerelease);
        }

        private static int ComparePrerelease(IReadOnlyList<string> left, IReadOnlyList<string> right)
        {
            if (left.Count == 0 && right.Count == 0)
                return 0;
            if (left.Count == 0)
                return 1;
            if (right.Count == 0)
                return -1;

            for (var i = 0; i < Math.Min(left.Count, right.Count); i++)
            {
                var leftIsNumber = int.TryParse(left[i], out var leftNumber);
                var rightIsNumber = int.TryParse(right[i], out var rightNumber);

                if (leftIsNumber && rightIsNumber)
                {
                    var numberComparison = leftNumber.CompareTo(rightNumber);
                    if (numberComparison != 0)
                        return numberComparison;
                    continue;
                }

                if (leftIsNumber)
                    return -1;
                if (rightIsNumber)
                    return 1;

                var textComparison = string.Compare(left[i], right[i], StringComparison.OrdinalIgnoreCase);
                if (textComparison != 0)
                    return textComparison;
            }

            return left.Count.CompareTo(right.Count);
        }
    }
}
