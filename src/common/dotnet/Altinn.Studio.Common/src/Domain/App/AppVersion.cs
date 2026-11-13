using System;

namespace Altinn.Studio.Common.Domain.App;

/// <summary>
/// A version of an app: the tag of a release, which a deployment names and the app's image is tagged with.
/// </summary>
/// <remarks>
/// Follows the rule for image tags: letters, digits, <c>_</c>, <c>.</c> and <c>-</c>, up to 128 characters, not
/// starting with <c>.</c> or <c>-</c>. Designer is stricter when it creates a release, where it also rejects
/// upper-case letters and <c>_</c>, but a release from before that rule can have them.
/// It is a struct, so <c>default</c> is an instance that no parsing produced. Reading its value throws.
/// </remarks>
public readonly record struct AppVersion
{
    private const int MaxLength = 128;

    private readonly string? _value;

    private AppVersion(string value)
    {
        _value = value;
    }

    /// <summary>The tag, such as <c>1.8.5</c> or <c>v14.26.0</c>.</summary>
    /// <exception cref="InvalidOperationException">This is the default value of the type.</exception>
    public string Value => _value ?? throw DefaultValue.Of(nameof(AppVersion));

    /// <summary>Parses a tag that follows the rule for image tags.</summary>
    public static bool TryParse(string? value, out AppVersion version)
    {
        version = default;
        if (value is null || value.Length is 0 or > MaxLength || value[0] is '.' or '-')
        {
            return false;
        }

        foreach (char c in value)
        {
            if (!AsciiText.IsLetterOrDigit(c) && c is not ('_' or '.' or '-'))
            {
                return false;
            }
        }

        version = new AppVersion(value);
        return true;
    }

    /// <summary>Parses a tag, or throws when it does not follow the rule for image tags.</summary>
    /// <exception cref="ArgumentException">The tag is not valid.</exception>
    public static AppVersion Parse(string value) =>
        TryParse(value, out AppVersion version)
            ? version
            : throw new ArgumentException($"'{value}' is not a valid app version.", nameof(value));

    /// <summary>Returns <see cref="Value"/>.</summary>
    public override string ToString() => _value ?? string.Empty;
}
