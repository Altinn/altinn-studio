using System;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Designer.Helpers;

internal static class GiteaUsernameGenerator
{
    private const int MaxGiteaUsernameLength = 40;
    private const int RandomSuffixLength = 4;

    internal static string GenerateUsername(string? givenName, string? familyName)
    {
        string sanitizedGiven = SanitizeName(givenName);
        string sanitizedFamily = SanitizeName(familyName);

        string prefix = (sanitizedGiven, sanitizedFamily) switch
        {
            ("", "") => "dev",
            ("", _) => sanitizedFamily,
            (_, "") => sanitizedGiven,
            _ => $"{sanitizedGiven}_{sanitizedFamily}",
        };

        return AppendSuffix(prefix);
    }

    internal static string GenerateBotUsername(string org, string name)
    {
        string sanitizedOrg = SanitizeName(org);
        string sanitizedName = SanitizeName(name, allowDigits: true);

        string prefix = string.IsNullOrEmpty(sanitizedName)
            ? $"bot_{sanitizedOrg}"
            : $"bot_{sanitizedOrg}_{sanitizedName}";

        return AppendSuffix(prefix);
    }

    internal static string SanitizeName(string? name, bool allowDigits = false)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "";
        }

        string sanitized = name.Trim().ToLowerInvariant().Replace("æ", "ae").Replace("ø", "o").Replace("å", "a");

        string pattern = allowDigits ? "[^a-z0-9_]" : "[^a-z_]";
        sanitized = Regex.Replace(sanitized, @"\s+", "_");
        sanitized = Regex.Replace(sanitized, pattern, "");
        sanitized = Regex.Replace(sanitized, "_+", "_");
        sanitized = sanitized.Trim('_');

        return sanitized;
    }

    private static string AppendSuffix(string prefix)
    {
        int maxPrefixLength = MaxGiteaUsernameLength - 1 - RandomSuffixLength;
        if (prefix.Length > maxPrefixLength)
        {
            prefix = prefix[..maxPrefixLength].TrimEnd('_');
        }

        string suffix = Guid.NewGuid().ToString("N")[..RandomSuffixLength];
        return $"{prefix}_{suffix}";
    }
}
