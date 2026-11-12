using System;
using System.Diagnostics.CodeAnalysis;

namespace Altinn.Studio.Common.App;

/// <summary>
/// A semantic version, such as <c>8.5.0</c> or <c>8.10.0-pr.4153.some-branch.bffb1113</c>: a major, a minor and a
/// patch number, then an optional pre-release and an optional build.
/// </summary>
/// <remarks>
/// Follows semantic versioning 2.0, with one exception: a pre-release identifier of only digits may start with a
/// zero. The version of a pull request build ends in a commit hash, which can be such an identifier.
/// Two versions that differ only in their build are not equal, but neither comes before the other.
/// </remarks>
public sealed record SemanticVersion : IComparable<SemanticVersion>
{
    // More digits than this do not fit in an int, and no version has them.
    private const int MaxDigits = 10;

    private SemanticVersion(string value, int major, int minor, int patch, string preRelease, string build)
    {
        Value = value;
        Major = major;
        Minor = minor;
        Patch = patch;
        PreRelease = preRelease;
        Build = build;
    }

    /// <summary>The version as it was written.</summary>
    public string Value { get; }

    /// <summary>The major number, such as 8 in <c>8.5.0</c>.</summary>
    public int Major { get; }

    /// <summary>The minor number, such as 5 in <c>8.5.0</c>.</summary>
    public int Minor { get; }

    /// <summary>The patch number, such as 0 in <c>8.5.0</c>.</summary>
    public int Patch { get; }

    /// <summary>The pre-release, such as <c>preview.3</c> in <c>9.0.0-preview.3</c>, or empty when it has none.</summary>
    public string PreRelease { get; }

    /// <summary>The build, such as <c>build.5</c> in <c>4.0.0+build.5</c>, or empty when it has none.</summary>
    public string Build { get; }

    /// <summary>Whether the version has a pre-release, which comes before the version without it.</summary>
    public bool IsPreRelease => PreRelease.Length > 0;

    /// <summary>Whether <paramref name="left"/> comes before <paramref name="right"/>.</summary>
    public static bool operator <(SemanticVersion? left, SemanticVersion? right) => Compare(left, right) < 0;

    /// <summary>Whether <paramref name="left"/> comes before <paramref name="right"/>, or neither before the other.</summary>
    public static bool operator <=(SemanticVersion? left, SemanticVersion? right) => Compare(left, right) <= 0;

    /// <summary>Whether <paramref name="left"/> comes after <paramref name="right"/>.</summary>
    public static bool operator >(SemanticVersion? left, SemanticVersion? right) => Compare(left, right) > 0;

    /// <summary>Whether <paramref name="left"/> comes after <paramref name="right"/>, or neither after the other.</summary>
    public static bool operator >=(SemanticVersion? left, SemanticVersion? right) => Compare(left, right) >= 0;

    /// <summary>Parses a semantic version.</summary>
    public static bool TryParse(string? value, [NotNullWhen(true)] out SemanticVersion? version)
    {
        version = null;
        if (value is null)
        {
            return false;
        }

        int plus = value.AsSpan().IndexOf('+');
        string build = plus < 0 ? string.Empty : value.Substring(plus + 1);
        string beforeBuild = plus < 0 ? value : value.Substring(0, plus);
        int dash = beforeBuild.AsSpan().IndexOf('-');
        string preRelease = dash < 0 ? string.Empty : beforeBuild.Substring(dash + 1);
        string[] numbers = (dash < 0 ? beforeBuild : beforeBuild.Substring(0, dash)).Split('.');
        if (
            numbers.Length != 3
            || (plus >= 0 && !AreIdentifiers(build))
            || (dash >= 0 && !AreIdentifiers(preRelease))
            || !TryParseNumber(numbers[0], out int major)
            || !TryParseNumber(numbers[1], out int minor)
            || !TryParseNumber(numbers[2], out int patch)
        )
        {
            return false;
        }

        version = new SemanticVersion(value, major, minor, patch, preRelease, build);
        return true;
    }

    /// <summary>Parses a semantic version, or throws when the value is not one.</summary>
    /// <exception cref="ArgumentException">The value is not a semantic version.</exception>
    public static SemanticVersion Parse(string value) =>
        TryParse(value, out SemanticVersion? version)
            ? version
            : throw new ArgumentException($"'{value}' is not a semantic version.", nameof(value));

    /// <summary>
    /// Compares by precedence: the numbers first, then a version before the same version without a pre-release, then
    /// the pre-release identifiers, where a number comes before a text. The build does not count.
    /// </summary>
    public int CompareTo(SemanticVersion? other) => Compare(this, other);

    /// <summary>Returns <see cref="Value"/>.</summary>
    public override string ToString() => Value;

    private static int Compare(SemanticVersion? left, SemanticVersion? right)
    {
        if (left is null || right is null)
        {
            return left is null ? (right is null ? 0 : -1) : 1;
        }

        int numbers =
            left.Major != right.Major ? left.Major.CompareTo(right.Major)
            : left.Minor != right.Minor ? left.Minor.CompareTo(right.Minor)
            : left.Patch.CompareTo(right.Patch);
        if (numbers != 0 || left.IsPreRelease != right.IsPreRelease)
        {
            return numbers != 0 ? numbers : (left.IsPreRelease ? -1 : 1);
        }

        string[] leftIdentifiers = left.PreRelease.Split('.');
        string[] rightIdentifiers = right.PreRelease.Split('.');
        for (int i = 0; i < Math.Min(leftIdentifiers.Length, rightIdentifiers.Length); i++)
        {
            int identifiers = CompareIdentifiers(leftIdentifiers[i], rightIdentifiers[i]);
            if (identifiers != 0)
            {
                return identifiers;
            }
        }

        return leftIdentifiers.Length.CompareTo(rightIdentifiers.Length);
    }

    private static int CompareIdentifiers(string left, string right)
    {
        bool leftIsNumber = IsNumber(left);
        if (leftIsNumber != IsNumber(right))
        {
            return leftIsNumber ? -1 : 1;
        }

        if (!leftIsNumber)
        {
            return Math.Sign(string.CompareOrdinal(left, right));
        }

        // Numbers of any length, compared without their leading zeros.
        string leftDigits = left.TrimStart('0');
        string rightDigits = right.TrimStart('0');
        return leftDigits.Length != rightDigits.Length
            ? leftDigits.Length.CompareTo(rightDigits.Length)
            : Math.Sign(string.CompareOrdinal(leftDigits, rightDigits));
    }

    // A number without leading zeros that an int can hold.
    private static bool TryParseNumber(string text, out int number)
    {
        number = 0;
        if (!IsNumber(text) || text.Length > MaxDigits || (text.Length > 1 && text[0] == '0'))
        {
            return false;
        }

        long value = 0;
        foreach (char c in text)
        {
            value = (value * 10) + (c - '0');
        }

        if (value > int.MaxValue)
        {
            return false;
        }

        number = (int)value;
        return true;
    }

    // Identifiers of letters, digits and hyphens, with dots between them.
    private static bool AreIdentifiers(string identifiers)
    {
        foreach (string identifier in identifiers.Split('.'))
        {
            if (identifier.Length == 0)
            {
                return false;
            }

            foreach (char c in identifier)
            {
                if (!AsciiText.IsLetterOrDigit(c) && c != '-')
                {
                    return false;
                }
            }
        }

        return true;
    }

    private static bool IsNumber(string text)
    {
        if (text.Length == 0)
        {
            return false;
        }

        foreach (char c in text)
        {
            if (!AsciiText.IsDigit(c))
            {
                return false;
            }
        }

        return true;
    }
}
