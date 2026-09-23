using System.Text.Json;
using System.Text.Json.Serialization;
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
/// widening it.
/// </summary>
internal sealed class AuthTokenFile
{
    private const string IngestGroup = "ingest";
    private const string QueryGroup = "query";

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
            _logger.LogError(exception, "Token file {Path} is not valid JSON; keeping the previous tokens.", path);
        }
    }

    private List<BearerTokenOptions> Parse(string content, string path)
    {
        var parsed =
            JsonSerializer.Deserialize(content, AuthTokenFileJson.Default.DictionaryStringDictionaryStringListString)
            ?? throw new JsonException($"Token file {path} is empty.");

        var tokens = new List<BearerTokenOptions>();
        // The authenticator compares every candidate and keeps the last match, so two identities
        // sharing one token value silently attribute both to whichever is read last. That is a
        // Secret-authoring mistake rather than a reason to reject the file, so it is reported.
        var identityByToken = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var (accessGroup, identities) in parsed)
        {
            var routeGroups = ResolveRouteGroups(accessGroup);
            if (routeGroups.Count == 0)
            {
                _logger.LogWarning(
                    "Token file {Path} has an unknown access group {AccessGroup}; its {Count} token(s) grant nothing.",
                    path,
                    accessGroup,
                    identities.Count
                );
                continue;
            }

            foreach (var (sourceIdentity, identityTokens) in identities)
            {
                foreach (var token in identityTokens.Distinct(StringComparer.Ordinal))
                {
                    if (string.IsNullOrWhiteSpace(token))
                    {
                        _logger.LogWarning(
                            "Token file {Path} has an empty token for {Identity}.",
                            path,
                            sourceIdentity
                        );
                        continue;
                    }

                    if (!identityByToken.TryAdd(token, sourceIdentity))
                    {
                        _logger.LogWarning(
                            "Token file {Path} uses the same token value for {FirstIdentity} and {SecondIdentity}; "
                                + "requests presenting it are attributed to whichever is read last.",
                            path,
                            identityByToken[token],
                            sourceIdentity
                        );
                    }

                    var entry = new BearerTokenOptions { Token = token, SourceIdentity = sourceIdentity };
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

/// <summary>Source-generated so the file can be read without reflection-based serialization.</summary>
[JsonSerializable(typeof(Dictionary<string, Dictionary<string, List<string>>>))]
internal sealed partial class AuthTokenFileJson : JsonSerializerContext;
