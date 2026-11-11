using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Reflection;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// The Altinn.App.Core version that planned a workflow. The app puts it in the context of every workflow it enqueues,
/// and the engine echoes it on every callback without reading it.
/// </summary>
/// <remarks>
/// A pod never runs a step that a newer version planned. The newer version may have planned a command, a payload or a
/// callback state field that the older one lacks, and the older one would fail the step permanently or drop the field
/// for the steps after it. The callback controller answers such a step with a status the engine retries, so the step
/// runs once it reaches a pod on the planner's version or newer.
/// </remarks>
internal static class PlannerVersion
{
    /// <summary>
    /// This pod's Altinn.App.Core package version without build metadata, such as <c>9.0.0-preview.10</c>. It always
    /// parses. It is not <c>altinnNugetVersion</c>, the assembly file version, which leaves out the prerelease:
    /// 9.0.0-preview.10 and 9.0.0 both report <c>9.0.0.0</c> there.
    /// </summary>
    public static string Current { get; } = Resolve(typeof(PlannerVersion).Assembly);

    /// <summary>
    /// Whether a step of a workflow that <paramref name="plannerVersion"/> planned must wait for a pod on that version
    /// or newer, because it is newer than <paramref name="podVersion"/>. Versions are ordered by Semantic Versioning
    /// 2.0.0 precedence, so <c>9.0.0-preview.10</c> is older than <c>9.0.0</c>.
    /// </summary>
    /// <param name="plannerVersion">
    /// The version the callback carries. A workflow planned before the stamp existed has none, and runs as before. A
    /// version that does not parse counts as newer: every version that stamps workflows writes one that parses, so a
    /// stamp this pod cannot read comes from a version it does not know.
    /// </param>
    /// <param name="podVersion">The version of the pod the callback reached, <see cref="Current"/> outside tests.</param>
    public static bool IsNewerThan(string? plannerVersion, string podVersion)
    {
        if (!TryParse(podVersion, out SemanticVersion? pod))
        {
            throw new ArgumentException($"'{podVersion}' is not a semantic version.", nameof(podVersion));
        }

        if (string.IsNullOrWhiteSpace(plannerVersion) || plannerVersion == podVersion)
        {
            return false;
        }

        return !TryParse(plannerVersion, out SemanticVersion? planner) || planner.CompareTo(pod) > 0;
    }

    private static string Resolve(Assembly assembly)
    {
        // src/App/PackageVersioning.props sets the informational version to the package version, followed by the
        // commit as build metadata.
        string? informational = assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion;
        if (informational is not null)
        {
            int metadataStart = informational.IndexOf('+', StringComparison.Ordinal);
            string version = metadataStart < 0 ? informational : informational[..metadataStart];
            if (TryParse(version, out _))
            {
                return version;
            }
        }

        // Only a build that bypasses the props file gets here. The release version without its prerelease still
        // orders this pod among the others.
        Version? assemblyVersion = assembly.GetName().Version;
        return string.Create(
            CultureInfo.InvariantCulture,
            $"{assemblyVersion?.Major ?? 0}.{assemblyVersion?.Minor ?? 0}.{Math.Max(assemblyVersion?.Build ?? 0, 0)}"
        );
    }

    private static bool TryParse(string value, [NotNullWhen(true)] out SemanticVersion? version)
    {
        version = null;

        int metadataStart = value.IndexOf('+', StringComparison.Ordinal);
        string precedence = metadataStart < 0 ? value : value[..metadataStart];
        int prereleaseStart = precedence.IndexOf('-', StringComparison.Ordinal);
        string[] core = (prereleaseStart < 0 ? precedence : precedence[..prereleaseStart]).Split('.');
        string[] prerelease = prereleaseStart < 0 ? [] : precedence[(prereleaseStart + 1)..].Split('.');

        if (
            core.Length != 3
            || !TryParseNumber(core[0], out int major)
            || !TryParseNumber(core[1], out int minor)
            || !TryParseNumber(core[2], out int patch)
            || !prerelease.All(IsPrereleaseIdentifier)
        )
        {
            return false;
        }

        version = new SemanticVersion(major, minor, patch, prerelease);
        return true;
    }

    private static bool TryParseNumber(string value, out int number)
    {
        number = 0;
        return IsNumeric(value)
            && (value.Length == 1 || value[0] != '0')
            && int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out number);
    }

    private static bool IsPrereleaseIdentifier(string identifier) =>
        identifier.Length > 0
        && identifier.All(c => char.IsAsciiLetterOrDigit(c) || c == '-')
        && (!IsNumeric(identifier) || identifier.Length == 1 || identifier[0] != '0');

    private static bool IsNumeric(string value) => value.Length > 0 && value.All(char.IsAsciiDigit);

    private sealed record SemanticVersion(int Major, int Minor, int Patch, string[] Prerelease)
    {
        public int CompareTo(SemanticVersion other)
        {
            int result = Major.CompareTo(other.Major);
            if (result == 0)
            {
                result = Minor.CompareTo(other.Minor);
            }
            if (result == 0)
            {
                result = Patch.CompareTo(other.Patch);
            }
            if (result != 0)
            {
                return result;
            }

            // A release outranks each of its prereleases.
            if (Prerelease.Length == 0 || other.Prerelease.Length == 0)
            {
                return (Prerelease.Length == 0).CompareTo(other.Prerelease.Length == 0);
            }

            for (int i = 0; i < Math.Min(Prerelease.Length, other.Prerelease.Length); i++)
            {
                result = CompareIdentifiers(Prerelease[i], other.Prerelease[i]);
                if (result != 0)
                {
                    return result;
                }
            }

            // preview.10.dev.1, a build past preview.10, outranks preview.10.
            return Prerelease.Length.CompareTo(other.Prerelease.Length);
        }

        private static int CompareIdentifiers(string left, string right)
        {
            bool leftIsNumeric = IsNumeric(left);
            bool rightIsNumeric = IsNumeric(right);
            if (leftIsNumeric && rightIsNumeric)
            {
                // Without leading zeros, the longer number is the larger one, at any length.
                int byLength = left.Length.CompareTo(right.Length);
                return byLength != 0 ? byLength : string.CompareOrdinal(left, right);
            }

            if (leftIsNumeric != rightIsNumeric)
            {
                return leftIsNumeric ? -1 : 1;
            }

            return string.CompareOrdinal(left, right);
        }
    }
}
