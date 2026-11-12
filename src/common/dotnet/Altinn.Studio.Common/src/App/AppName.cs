using System;

namespace Altinn.Studio.Common.App;

/// <summary>The name of an app, such as <c>apps-test</c>, which is also the name of its repository.</summary>
/// <remarks>
/// Follows the rule Designer's routes use, <c>^(?!datamodels$)[a-z][a-z0-9-]{1,28}[a-z0-9]$</c>.
/// It is a struct, so <c>default</c> is an instance that no parsing produced. Reading its value throws.
/// </remarks>
public readonly record struct AppName
{
    private const int MinLength = 3;
    private const int MaxLength = 30;

    // The repository an org keeps its shared data models in, which is not an app.
    private const string Reserved = "datamodels";

    private readonly string? _value;

    private AppName(string value)
    {
        _value = value;
    }

    /// <summary>The name, such as <c>apps-test</c>.</summary>
    /// <exception cref="InvalidOperationException">This is the default value of the type.</exception>
    public string Value => _value ?? throw DefaultValue.Of(nameof(AppName));

    /// <summary>Parses a name that follows the rule for apps.</summary>
    public static bool TryParse(string? value, out AppName app)
    {
        app = default;
        if (value is null || value.Length is < MinLength or > MaxLength || value == Reserved)
        {
            return false;
        }

        if (!AsciiText.IsLower(value[0]) || !IsLowerLetterOrDigit(value[value.Length - 1]))
        {
            return false;
        }

        for (int i = 1; i < value.Length - 1; i++)
        {
            if (!IsLowerLetterOrDigit(value[i]) && value[i] != '-')
            {
                return false;
            }
        }

        app = new AppName(value);
        return true;
    }

    /// <summary>Parses a name, or throws when it does not follow the rule for apps.</summary>
    /// <exception cref="ArgumentException">The name is not valid.</exception>
    public static AppName Parse(string value) =>
        TryParse(value, out AppName app)
            ? app
            : throw new ArgumentException($"'{value}' is not a valid app name.", nameof(value));

    /// <summary>Returns <see cref="Value"/>.</summary>
    public override string ToString() => _value ?? string.Empty;

    private static bool IsLowerLetterOrDigit(char c) => AsciiText.IsLower(c) || AsciiText.IsDigit(c);
}
