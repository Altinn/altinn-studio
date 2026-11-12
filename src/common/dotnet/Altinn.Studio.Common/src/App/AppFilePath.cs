using System;
using System.Diagnostics.CodeAnalysis;

namespace Altinn.Studio.Common.App;

/// <summary>
/// The path of a file that an <see cref="AppSource"/> has, relative to the app's root, with <c>/</c> separators. It
/// cannot point outside the app, so it is safe to join to the folder the app is in.
/// </summary>
/// <remarks>
/// Only an <see cref="AppSource"/> creates one, so code that holds one knows that a source had that file, and not
/// only that a string has the form of a path.
/// </remarks>
public sealed record AppFilePath
{
    private AppFilePath(string value)
    {
        Value = value;
        int slash = value.LastIndexOf('/');
        FileName = value.Substring(slash + 1);
        Directory = slash < 0 ? string.Empty : value.Substring(0, slash);
    }

    /// <summary>The path, such as <c>App/App.csproj</c>.</summary>
    public string Value { get; }

    /// <summary>The last segment, such as <c>App.csproj</c>.</summary>
    public string FileName { get; }

    /// <summary>The segments before the last, such as <c>App</c>, or empty for a file at the root.</summary>
    public string Directory { get; }

    // A relative path whose segments are not empty, . or .., without \ or NUL.
    internal static bool TryCreate(string? value, [NotNullWhen(true)] out AppFilePath? path)
    {
        path = null;
        if (value is null || value.Length == 0)
        {
            return false;
        }

        int start = 0;
        for (int i = 0; i <= value.Length; i++)
        {
            if (i < value.Length && value[i] is '\\' or '\0')
            {
                return false;
            }

            if (i == value.Length || value[i] == '/')
            {
                int length = i - start;
                bool dots =
                    (length == 1 && value[start] == '.')
                    || (length == 2 && value[start] == '.' && value[start + 1] == '.');
                if (length == 0 || dots)
                {
                    return false;
                }

                start = i + 1;
            }
        }

        path = new AppFilePath(value);
        return true;
    }

    /// <summary>Whether the path is another, ignoring case, as apps written on Windows may differ in case.</summary>
    public bool Is(string other) => string.Equals(Value, other, StringComparison.OrdinalIgnoreCase);

    /// <summary>Returns <see cref="Value"/>.</summary>
    public override string ToString() => Value;
}
