using System.Text.RegularExpressions;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// Provides methods to sanitize user-controlled input before logging.
/// Removes potentially dangerous characters to prevent log injection attacks.
/// </summary>
internal static partial class LogSanitizer
{
    // Regex pattern to match only Unicode control characters (category Cc) like newlines, tabs, etc.
    private static readonly Regex _controlCharPattern = ControlCharPattern();

    // Maximum length for sanitized log entries to prevent DoS from extremely long inputs
    private const int MaxSanitizedLength = 1000;

    /// <summary>
    /// Remove control characters (newlines, carriage returns, tabs, etc.) that could affect log structure
    /// </summary>
    /// <param name="input">The nullable string input to sanitize.</param>
    /// <returns>A sanitized string safe for logging.</returns>
    public static string Sanitize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        // Remove all control characters (including newlines, carriage returns, tabs, etc.)
        string sanitized = _controlCharPattern.Replace(input, "");

        // Trim whitespace
        sanitized = sanitized.Trim();

        // Limit length to prevent DoS attacks via extremely long log entries
        if (sanitized.Length > MaxSanitizedLength)
            sanitized = string.Concat(sanitized.AsSpan(0, MaxSanitizedLength), "... (truncated)");

        return sanitized;
    }

    // Matches only Unicode control characters (category Cc) such as newlines, carriage returns,
    // tabs, and other non-printable control characters that could enable log injection attacks, while
    // preserving other Unicode characters including surrogate pairs, formatting characters, and emojis.
    [GeneratedRegex(@"[\p{Cc}]", RegexOptions.Compiled)]
    private static partial Regex ControlCharPattern();
}
