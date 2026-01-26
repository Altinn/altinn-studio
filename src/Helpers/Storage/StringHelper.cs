using System;

namespace Altinn.Platform.Storage.Helpers;

/// <summary>
/// Provides string helper extension methods.
/// </summary>
public static class StringHelper
{
    /// <summary>
    /// Removes all newline characters from the specified string.
    /// </summary>
    /// <param name="value">The string from which to remove newline characters.</param>
    /// <returns>A string with all newline characters removed, or the original string if it is null or empty.</returns>
    public static string RemoveNewlines(this string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        return value
            .Replace("\n", string.Empty)
            ?.Replace("\r", string.Empty)
            ?.Replace(Environment.NewLine, string.Empty);
    }
}
