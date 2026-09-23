using System.Text.Json;
using Altinn.Studio.Observability.Proxy.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Observability.Proxy.Auth;

/// <summary>
/// The accepted-token list, read from the mounted <c>auth-tokens.json</c> Secret entry.
///
/// The file groups tokens by the access they grant, so the accepted list is data rather than part
/// of the Deployment. Rotating a token is then a Secret change and takes effect without a restart:
///
/// <code>
/// {
///   "ingest": { "studio-prod": ["current", "previous"], "runtime-prod": ["current", "previous"] },
///   "query":  { "grafana": ["current", "previous"] }
/// }
/// </code>
///
/// Each identity accepts a list of tokens so that a rotation can overlap: the replaced token stays
/// accepted next to the new one, and is dropped only after every source has moved. Outside a
/// rotation both entries hold the same value, which is not reported.
///
/// A top-level key the proxy does not know grants nothing, so a typo denies access rather than
/// widening it. A token shorter than <see cref="MinimumTokenLength"/>, or one that is still a
/// pipeline placeholder, is rejected and reported by identity; the rest of the file still applies.
/// </summary>
internal sealed class AuthTokenFile
{
    private const string IngestGroup = "ingest";
    private const string QueryGroup = "query";

    /// <summary>Accepted tokens are at least this long; anything shorter is rejected when read.</summary>
    public const int MinimumTokenLength = 32;

    private const string PlaceholderMarker = "__";

    private static readonly IReadOnlyList<string> IngestRouteGroups = [ObservabilityPaths.OtlpRouteGroup];

    private readonly IOptionsMonitor<ObservabilityProxyOptions> _options;
    private readonly ILogger<AuthTokenFile> _logger;
    private readonly TimeProvider _timeProvider;
    private readonly Lock _gate = new();

    private IReadOnlyList<BearerTokenOptions> _tokens = [];
    private DateTimeOffset _nextCheck = DateTimeOffset.MinValue;
    private string _lastContent = string.Empty;

    public AuthTokenFile(
        IOptionsMonitor<ObservabilityProxyOptions> options,
        ILogger<AuthTokenFile> logger,
        TimeProvider timeProvider
    )
    {
        _options = options;
        _logger = logger;
        _timeProvider = timeProvider;
    }

    public IReadOnlyList<BearerTokenOptions> GetTokens()
    {
        var authentication = _options.CurrentValue.Authentication;
        if (string.IsNullOrWhiteSpace(authentication.TokensFilePath))
        {
            return [];
        }

        lock (_gate)
        {
            var now = _timeProvider.GetUtcNow();
            if (now < _nextCheck)
            {
                return _tokens;
            }

            _nextCheck = now.AddSeconds(Math.Max(1, authentication.TokensFileReloadSeconds));
            ReloadIfChanged(authentication.TokensFilePath);
            return _tokens;
        }
    }

    private void ReloadIfChanged(string path)
    {
        // The file is read in full every interval rather than checked for changes first. A mounted
        // Secret is a symlink that Kubernetes swaps, and a rotated token is usually the same number
        // of bytes, so neither the path's size nor its timestamp is a dependable signal. The file
        // is small and this runs at most once per interval.
        string content;
        try
        {
            content = File.ReadAllText(path);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            // Keep serving with the tokens already loaded. Replacing them with nothing on a bad read
            // would turn one unreadable Secret into an outage for every source at once.
            _logger.LogError(exception, "Could not read the token file {Path}; keeping the previous tokens.", path);
            return;
        }

        if (string.Equals(content, _lastContent, StringComparison.Ordinal))
        {
            return;
        }

        try
        {
            var tokens = Parse(content, path);
            _lastContent = content;
            _tokens = tokens;
            _logger.LogInformation("Read {Count} accepted token(s) from {Path}.", tokens.Count, path);
        }
        catch (JsonException exception)
        {
            // Any file that is not the documented shape is handled as unreadable, whether the JSON
            // itself is broken or a group, identity or entry is the wrong type or null. The
            // exception names the part of the file that is wrong, never a token.
            _logger.LogError(
                exception,
                "Token file {Path} is not a valid token file; keeping the previous tokens.",
                path
            );
        }
    }

    private List<BearerTokenOptions> Parse(string content, string path)
    {
        using var document = JsonDocument.Parse(content);
        var accessGroups = ExpectObject(document.RootElement, "The top level");

        var tokens = new List<BearerTokenOptions>();
        // The authenticator compares every candidate and keeps the last match, so two identities
        // sharing one token value silently attribute both to whichever is read last. That is a
        // Secret-authoring mistake rather than a reason to reject the file, so it is reported.
        var identityByToken = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var accessGroup in accessGroups)
        {
            var identities = new List<(string Name, List<string> Tokens)>();
            foreach (var identity in ExpectObject(accessGroup.Value, $"Access group {accessGroup.Name}"))
            {
                identities.Add(
                    (identity.Name, ExpectTokenList(identity.Value, $"Identity {identity.Name} in {accessGroup.Name}"))
                );
            }

            var routeGroups = ResolveRouteGroups(accessGroup.Name);
            if (routeGroups.Count == 0)
            {
                _logger.LogWarning(
                    "Token file {Path} has an unknown access group {AccessGroup}; its {Count} identity(ies) grant nothing.",
                    path,
                    accessGroup.Name,
                    identities.Count
                );
                continue;
            }

            foreach (var identity in identities)
            {
                foreach (var token in identity.Tokens.Distinct(StringComparer.Ordinal))
                {
                    if (RejectionReason(token) is { } reason)
                    {
                        // Named by identity only. Not even the token's tag is logged: the tag of a
                        // short token is enough to recover it by trying every candidate.
                        _logger.LogError(
                            "Token file {Path} has a token for {Identity} in {AccessGroup} that {Reason}; it is not accepted.",
                            path,
                            identity.Name,
                            accessGroup.Name,
                            reason
                        );
                        continue;
                    }

                    if (!identityByToken.TryAdd(token, identity.Name))
                    {
                        _logger.LogWarning(
                            "Token file {Path} uses the same token value for {FirstIdentity} and {SecondIdentity}; "
                                + "requests presenting it are attributed to whichever is read last.",
                            path,
                            identityByToken[token],
                            identity.Name
                        );
                    }

                    var entry = new BearerTokenOptions { Token = token, SourceIdentity = identity.Name };
                    foreach (var routeGroup in routeGroups)
                    {
                        entry.AllowedRouteGroups.Add(routeGroup);
                    }

                    tokens.Add(entry);
                }
            }
        }

        return tokens;
    }

    /// <summary>
    /// Why <paramref name="token"/> is not accepted, or <c>null</c> when it is. A generated token is
    /// 64 hex characters. A <c>__name__</c> value is the pipeline's placeholder for a vault secret
    /// that did not exist when the Secret was written; it is in the pipeline definition, so anyone
    /// who has read that could present it.
    /// </summary>
    private static string? RejectionReason(string token)
    {
        if (
            token.Length >= 2 * PlaceholderMarker.Length
            && token.StartsWith(PlaceholderMarker, StringComparison.Ordinal)
            && token.EndsWith(PlaceholderMarker, StringComparison.Ordinal)
        )
        {
            return "is an unreplaced pipeline placeholder";
        }

        return token.Length < MinimumTokenLength ? $"is shorter than {MinimumTokenLength} characters" : null;
    }

    private static JsonElement.ObjectEnumerator ExpectObject(JsonElement element, string what)
    {
        return element.ValueKind == JsonValueKind.Object
            ? element.EnumerateObject()
            : throw new JsonException($"{what} is {Describe(element)}, not an object.");
    }

    private static List<string> ExpectTokenList(JsonElement element, string what)
    {
        if (element.ValueKind != JsonValueKind.Array)
        {
            throw new JsonException($"{what} is {Describe(element)}, not a list of tokens.");
        }

        var tokens = new List<string>();
        foreach (var entry in element.EnumerateArray())
        {
            tokens.Add(
                entry.ValueKind == JsonValueKind.String
                    ? entry.GetString() ?? string.Empty
                    : throw new JsonException($"{what} has an entry that is {Describe(entry)}, not a string.")
            );
        }

        return tokens;
    }

    private static string Describe(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Null => "null",
            JsonValueKind.Object => "an object",
            JsonValueKind.Array => "a list",
            JsonValueKind.String => "a string",
            JsonValueKind.Number => "a number",
            _ => "a boolean",
        };
    }

    private static IReadOnlyList<string> ResolveRouteGroups(string accessGroup)
    {
        if (string.Equals(accessGroup, IngestGroup, StringComparison.OrdinalIgnoreCase))
        {
            return IngestRouteGroups;
        }

        return string.Equals(accessGroup, QueryGroup, StringComparison.OrdinalIgnoreCase)
            ? ObservabilityPaths.ReadRouteGroups
            : [];
    }
}
