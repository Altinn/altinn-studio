using NuGet.Versioning;

namespace Altinn.Studio.Cli.Upgrade.ProjectFile;

/// <summary>Reads a bare package version or an exact NuGet bracketed version.</summary>
internal static class PinnedPackageVersion
{
    public static NuGetVersion? Parse(string? value)
    {
        if (value is null)
            return null;
        if (NuGetVersion.TryParse(value, out var version))
            return version;

        return
            VersionRange.TryParse(value, out var range)
            && !range.IsFloating
            && range.IsMinInclusive
            && range.IsMaxInclusive
            && range.MinVersion is { } minimum
            && minimum == range.MaxVersion
            ? minimum
            : null;
    }
}
