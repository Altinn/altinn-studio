using System.Diagnostics.CodeAnalysis;

namespace Altinn.Studio.Common.App.V8;

/// <summary>
/// The app frontend version that a v8 app loads: an exact version, or a channel that follows the newest release of a
/// major or of a minor.
/// </summary>
public abstract record AppFrontendVersion
{
    // More digits than this do not fit in an int, and no version has them.
    private const int MaxDigits = 9;

    private AppFrontendVersion(string value)
    {
        Value = value;
    }

    /// <summary>The version as the app writes it, such as <c>4</c>, <c>4.11</c> or <c>4.11.2</c>.</summary>
    public string Value { get; }

    /// <summary>The major number, such as 4.</summary>
    public abstract int Major { get; }

    /// <summary>One version, such as <c>4.11.2</c> or a pull request build.</summary>
    public sealed record Exact : AppFrontendVersion
    {
        internal Exact(SemanticVersion version)
            : base(version.Value)
        {
            Version = version;
        }

        /// <summary>The version.</summary>
        public SemanticVersion Version { get; }

        /// <inheritdoc />
        public override int Major => Version.Major;
    }

    /// <summary>
    /// The newest release of a major, such as <c>4</c>, or of a minor, such as <c>4.11</c>. Which version that is
    /// changes as releases are made.
    /// </summary>
    public sealed record Channel : AppFrontendVersion
    {
        internal Channel(string value, int major, int? minor)
            : base(value)
        {
            Major = major;
            Minor = minor;
        }

        /// <inheritdoc />
        public override int Major { get; }

        /// <summary>The minor number, or <c>null</c> when the channel follows the major.</summary>
        public int? Minor { get; }
    }

    /// <summary>
    /// Parses an exact version, which is a semantic version, or a channel, which is a major number with an optional
    /// minor number.
    /// </summary>
    public static bool TryParse(string? value, [NotNullWhen(true)] out AppFrontendVersion? version)
    {
        version = null;
        if (value is null)
        {
            return false;
        }

        if (SemanticVersion.TryParse(value, out SemanticVersion? exact))
        {
            version = new Exact(exact);
            return true;
        }

        string[] numbers = value.Split('.');
        if (
            numbers.Length > 2
            || !TryParseNumber(numbers[0], out int major)
            || !TryParseNumber(numbers.Length == 2 ? numbers[1] : "0", out int minor)
        )
        {
            return false;
        }

        version = new Channel(value, major, numbers.Length == 2 ? minor : null);
        return true;
    }

    /// <summary>Returns <see cref="Value"/>.</summary>
    public sealed override string ToString() => Value;

    // Digits only. A leading zero is allowed, as Designer allows it in a channel.
    private static bool TryParseNumber(string text, out int number)
    {
        number = 0;
        if (text.Length is 0 or > MaxDigits)
        {
            return false;
        }

        foreach (char c in text)
        {
            if (!AsciiText.IsDigit(c))
            {
                return false;
            }

            number = (number * 10) + (c - '0');
        }

        return true;
    }
}
