#nullable disable
using System;
using System.Linq;
using System.Text.RegularExpressions;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class UrlPolicyValidator : IUrlPolicyValidator
{
    private readonly UrlValidationSettings _urlValidationSettings;

    public UrlPolicyValidator(UrlValidationSettings urlValidationSettings)
    {
        _urlValidationSettings = urlValidationSettings;
    }

    public bool IsAllowed(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return false;
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            return false;
        }

        string host = uri.Host.ToLowerInvariant();
        string path = uri.AbsolutePath.TrimEnd('/').ToLowerInvariant();

        return !IsBlocked(host) || IsBlockedButWhitelisted(host, path);
    }

    private bool IsBlocked(string host)
    {
        return _urlValidationSettings.BlockedList.Any(blockedDomain => IsDomainMatch(blockedDomain, host));
    }

    private bool IsBlockedButWhitelisted(string host, string path)
    {
        return _urlValidationSettings.AllowedList.Any(allowEntry => IsAllowEntryMatch(allowEntry, host, path));
    }

    private bool IsAllowEntryMatch(string allowEntry, string host, string path)
    {
        if (!allowEntry.Contains("/"))
        {
            return IsDomainMatch(allowEntry, host);
        }

        (string allowedHost, string allowedPathPattern) = SplitHostAndPath(allowEntry);
        if (!IsDomainMatch(allowedHost, host))
        {
            return false;
        }

        string regexPattern = WildcardToRegex(allowedPathPattern);
        return Regex.IsMatch(path, regexPattern, RegexOptions.IgnoreCase);
    }

    private static string WildcardToRegex(string pattern)
    {
        string safeWildcardPattern = Regex.Escape(pattern);
        string regexCompatiblePattern = safeWildcardPattern.Replace("\\*", ".*");
        string anchoredRegexPattern = $"^{regexCompatiblePattern}$";

        return anchoredRegexPattern;
    }

    private static bool IsDomainMatch(string configuredDomain, string actualHost)
    {
        return actualHost == configuredDomain || actualHost.EndsWith("." + configuredDomain);
    }

    private (string host, string path) SplitHostAndPath(string entry)
    {
        string[] parts = entry.Split('/', 2);
        string host = parts[0];
        string path = "/" + parts[1];
        return (host, path);
    }
}
