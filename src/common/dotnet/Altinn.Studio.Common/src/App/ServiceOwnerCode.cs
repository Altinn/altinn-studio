using System;

namespace Altinn.Studio.Common.App;

/// <summary>
/// A service owner code, also called an org code: the short code that identifies a service owner, such as
/// <c>ttd</c>. It is the <c>org</c> in an app's ID, <c>&lt;org&gt;/&lt;app&gt;</c>.
/// </summary>
/// <remarks>
/// A code that parses only has the form of one. Whether a service owner has it is what a
/// <see cref="ServiceOwnerRegistry"/> answers, with a <see cref="ServiceOwner"/>. A code identifies one service
/// owner, and a service owner can have several codes. In Altinn Studio, the same place in a repository's name holds
/// the repository owner, an organization or a user there, which need not be a service owner's code.
/// A code is lower-case letters and digits, as every code in the service owner registry is, and as the host name of
/// a service owner's cluster needs. It has up to the 40 characters that Gitea, which holds the repositories, allows
/// an organization. Designer's rule for a repository owner is wider.
/// It is a struct, so <c>default</c> is an instance that no parsing produced. Reading its value throws.
/// </remarks>
public readonly record struct ServiceOwnerCode
{
    private const int MaxLength = 40;

    private readonly string? _value;

    private ServiceOwnerCode(string value)
    {
        _value = value;
    }

    /// <summary>The code, such as <c>ttd</c>.</summary>
    /// <exception cref="InvalidOperationException">This is the default value of the type.</exception>
    public string Value => _value ?? throw DefaultValue.Of(nameof(ServiceOwnerCode));

    /// <summary>Parses a code that follows the rule for service owner codes.</summary>
    public static bool TryParse(string? value, out ServiceOwnerCode code)
    {
        code = default;
        if (value is null || value.Length is 0 or > MaxLength)
        {
            return false;
        }

        foreach (char c in value)
        {
            if (!AsciiText.IsLower(c) && !AsciiText.IsDigit(c))
            {
                return false;
            }
        }

        code = new ServiceOwnerCode(value);
        return true;
    }

    /// <summary>Parses a code, or throws when it does not follow the rule for service owner codes.</summary>
    /// <exception cref="ArgumentException">The code is not valid.</exception>
    public static ServiceOwnerCode Parse(string value) =>
        TryParse(value, out ServiceOwnerCode code)
            ? code
            : throw new ArgumentException($"'{value}' is not a valid service owner code.", nameof(value));

    /// <summary>Returns <see cref="Value"/>.</summary>
    public override string ToString() => _value ?? string.Empty;
}
