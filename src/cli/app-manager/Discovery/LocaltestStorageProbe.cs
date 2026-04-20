using System.Text.Json;

namespace Altinn.Studio.AppManager.Discovery;

internal sealed class LocaltestStorageProbe
{
    public const string HttpClientName = "localtest-storage-probe";

    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    private readonly Uri? _baseUri;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<LocaltestStorageProbe> _logger;

    public LocaltestStorageProbe(
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<LocaltestStorageProbe> logger
    )
    {
        _baseUri = ResolveBaseUri(configuration["Localtest:Url"]);
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<LocaltestStorageProbeResult> ProbeApplicationMetadata(
        string appId,
        CancellationToken cancellationToken
    )
    {
        if (_baseUri is null)
            return LocaltestStorageProbeResult.Unavailable;

        var path = BuildApplicationMetadataPath(appId);
        if (path is null)
            return LocaltestStorageProbeResult.NotReady;

        try
        {
            using var client = _httpClientFactory.CreateClient(HttpClientName);
            client.BaseAddress = _baseUri;
            using var response = await client.GetAsync(path, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                if (_logger.IsEnabled(LogLevel.Debug))
                {
                    _logger.LogDebug(
                        "Storage metadata probe for {AppId} returned {StatusCode}",
                        appId,
                        (int)response.StatusCode
                    );
                }
                return LocaltestStorageProbeResult.NotReady;
            }

            await using var content = await response.Content.ReadAsStreamAsync(cancellationToken);
            var metadata = await JsonSerializer.DeserializeAsync<ApplicationMetadataResponse>(
                content,
                _jsonOptions,
                cancellationToken
            );

            var reachable = string.Equals(metadata?.Id, appId, StringComparison.OrdinalIgnoreCase);
            if (!reachable && _logger.IsEnabled(LogLevel.Debug))
            {
                _logger.LogDebug(
                    "Storage metadata probe for {AppId} returned app id {ResolvedAppId}",
                    appId,
                    metadata?.Id ?? "<none>"
                );
            }

            return reachable ? LocaltestStorageProbeResult.Ready : LocaltestStorageProbeResult.NotReady;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (JsonException ex)
        {
            if (_logger.IsEnabled(LogLevel.Debug))
                _logger.LogDebug(ex, "Storage metadata probe for {AppId} returned invalid JSON", appId);
            return LocaltestStorageProbeResult.NotReady;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            if (_logger.IsEnabled(LogLevel.Debug))
                _logger.LogDebug(ex, "Storage metadata probe for {AppId} could not reach localtest", appId);
            return LocaltestStorageProbeResult.Unavailable;
        }
    }

    private static string? BuildApplicationMetadataPath(string appId)
    {
        var parts = appId.Split('/', 2, StringSplitOptions.TrimEntries);
        if (parts.Length != 2 || string.IsNullOrWhiteSpace(parts[0]) || string.IsNullOrWhiteSpace(parts[1]))
            return null;

        return $"/storage/api/v1/applications/{Uri.EscapeDataString(parts[0])}/{Uri.EscapeDataString(parts[1])}";
    }

    private static Uri? ResolveBaseUri(string? localtestUrl)
    {
        if (!Uri.TryCreate(localtestUrl, UriKind.Absolute, out var uri))
            return null;

        if (
            !string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
        )
            return null;

        return new UriBuilder(uri)
        {
            Path = "",
            Query = "",
            Fragment = "",
        }.Uri;
    }

    private sealed record ApplicationMetadataResponse(string Id);
}

internal enum LocaltestStorageProbeResult
{
    Ready,
    NotReady,
    Unavailable,
}
