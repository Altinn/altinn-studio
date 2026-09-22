using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Text.RegularExpressions;

namespace Altinn.Studio.AppDist;

/// <summary>
/// A Semantic Versioning 2.0.0 version used to filter and order app distribution versions.
/// </summary>
internal sealed partial class SemVer
{
    private readonly long _major;
    private readonly long _minor;
    private readonly long _patch;
    private readonly string[] _preRelease;

    private SemVer(string original, long major, long minor, long patch, string[] preRelease)
    {
        Original = original;
        _major = major;
        _minor = minor;
        _patch = patch;
        _preRelease = preRelease;
    }

    public string Original { get; }

    public static bool TryParse(string value, [NotNullWhen(true)] out SemVer? version)
    {
        version = null;
        var match = Pattern().Match(value);
        if (!match.Success)
            return false;
        version = new SemVer(
            value,
            long.Parse(match.Groups["major"].ValueSpan, CultureInfo.InvariantCulture),
            long.Parse(match.Groups["minor"].ValueSpan, CultureInfo.InvariantCulture),
            long.Parse(match.Groups["patch"].ValueSpan, CultureInfo.InvariantCulture),
            match.Groups["pre"].Success ? match.Groups["pre"].Value.Split('.') : []
        );
        return true;
    }

    /// <summary>
    /// Keeps the values that are valid versions and returns them in ascending precedence order.
    /// </summary>
    public static IReadOnlyList<string> FilterAndSort(IEnumerable<string> values)
    {
        var versions = new List<SemVer>();
        foreach (var value in values)
        {
            if (TryParse(value, out var version))
                versions.Add(version);
        }
        versions.Sort(Compare);
        return versions.Select(v => v.Original).Distinct(StringComparer.Ordinal).ToArray();
    }

    /// <summary>Orders by Semantic Versioning precedence; build metadata is ignored.</summary>
    private static int Compare(SemVer left, SemVer right)
    {
        var result = left._major.CompareTo(right._major);
        if (result != 0)
            return result;
        result = left._minor.CompareTo(right._minor);
        if (result != 0)
            return result;
        result = left._patch.CompareTo(right._patch);
        if (result != 0)
            return result;
        result = ComparePreRelease(left._preRelease, right._preRelease);
        return result != 0 ? result : string.CompareOrdinal(left.Original, right.Original);
    }

    private static int ComparePreRelease(string[] left, string[] right)
    {
        // A version without pre-release identifiers has higher precedence than one with them.
        if (left.Length == 0 || right.Length == 0)
            return right.Length.CompareTo(left.Length);

        for (var i = 0; i < Math.Min(left.Length, right.Length); i++)
        {
            var leftIsNumber = long.TryParse(
                left[i],
                NumberStyles.None,
                CultureInfo.InvariantCulture,
                out var leftNumber
            );
            var rightIsNumber = long.TryParse(
                right[i],
                NumberStyles.None,
                CultureInfo.InvariantCulture,
                out var rightNumber
            );
            var result = (leftIsNumber, rightIsNumber) switch
            {
                (true, true) => leftNumber.CompareTo(rightNumber),
                (true, false) => -1,
                (false, true) => 1,
                (false, false) => string.CompareOrdinal(left[i], right[i]),
            };
            if (result != 0)
                return result;
        }
        return left.Length.CompareTo(right.Length);
    }

    [GeneratedRegex(
        @"^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)"
            + @"(?:-(?<pre>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?"
            + @"(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$"
    )]
    private static partial Regex Pattern();
}
