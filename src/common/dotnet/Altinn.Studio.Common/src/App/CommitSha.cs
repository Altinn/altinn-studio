using System;

namespace Altinn.Studio.Common.App;

/// <summary>The full SHA-1 of a commit in an app's repository, in lower-case hex.</summary>
/// <remarks>
/// It is a struct, so <c>default</c> is an instance that no parsing produced. Reading its value throws.
/// </remarks>
public readonly record struct CommitSha
{
    private const int Length = 40;

    private readonly string? _value;

    private CommitSha(string value)
    {
        _value = value;
    }

    /// <summary>The 40 hex digits.</summary>
    /// <exception cref="InvalidOperationException">This is the default value of the type.</exception>
    public string Value => _value ?? throw DefaultValue.Of(nameof(CommitSha));

    /// <summary>The first seven digits, as Git shows a commit.</summary>
    public string Abbreviated => Value.Substring(0, 7);

    /// <summary>Parses 40 hex digits, in either case.</summary>
    public static bool TryParse(string? value, out CommitSha commit)
    {
        commit = default;
        if (value is null || value.Length != Length)
        {
            return false;
        }

        char[] digits = new char[Length];
        for (int i = 0; i < Length; i++)
        {
            char c = value[i];
            if (c is >= 'A' and <= 'F')
            {
                c = (char)(c + ('a' - 'A'));
            }
            else if (!AsciiText.IsDigit(c) && c is not (>= 'a' and <= 'f'))
            {
                return false;
            }

            digits[i] = c;
        }

        commit = new CommitSha(new string(digits));
        return true;
    }

    /// <summary>Parses 40 hex digits, or throws.</summary>
    /// <exception cref="ArgumentException">The value is not a commit SHA.</exception>
    public static CommitSha Parse(string value) =>
        TryParse(value, out CommitSha commit)
            ? commit
            : throw new ArgumentException($"'{value}' is not a commit SHA.", nameof(value));

    /// <summary>Returns <see cref="Value"/>.</summary>
    public override string ToString() => _value ?? string.Empty;
}
