using System.Text.Json;

namespace Altinn.Studio.StudioctlServer.Discovery;

internal sealed class AppMetadataProbe
{
    public const string HttpClientName = "app-metadata-probe";

    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    // checkOrgApp=false makes LocalTest ignore the route values and return the app's actual org/app id.
    private const string WildcardMetadataProbePath = "/org/app/api/v1/applicationmetadata?checkOrgApp=false";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AppMetadataProbe> _logger;

    public AppMetadataProbe(IHttpClientFactory httpClientFactory, ILogger<AppMetadataProbe> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<string?> Probe(Uri baseUri, CancellationToken cancellationToken)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient(HttpClientName);
            client.BaseAddress = baseUri;
            using var response = await client.GetAsync(WildcardMetadataProbePath, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                if (_logger.IsEnabled(LogLevel.Debug))
                {
                    _logger.LogDebug(
                        "Metadata probe to {BaseUri} returned {StatusCode}",
                        baseUri,
                        (int)response.StatusCode
                    );
                }
                return null;
            }

            await using var content = await response.Content.ReadAsStreamAsync(cancellationToken);
            var metadata = await JsonSerializer.DeserializeAsync<ApplicationMetadataResponse>(
                content,
                _jsonOptions,
                cancellationToken
            );

            if (string.IsNullOrWhiteSpace(metadata?.Id))
            {
                if (_logger.IsEnabled(LogLevel.Debug))
                    _logger.LogDebug("Metadata probe to {BaseUri} returned no app id", baseUri);
                return null;
            }

            if (_logger.IsEnabled(LogLevel.Debug))
                _logger.LogDebug("Metadata probe to {BaseUri} resolved app {AppId}", baseUri, metadata.Id);
            return metadata.Id;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (HttpRequestException ex)
        {
            if (_logger.IsEnabled(LogLevel.Debug))
                _logger.LogDebug(ex, "Metadata probe to {BaseUri} failed", baseUri);
            return null;
        }
        catch (JsonException ex)
        {
            if (_logger.IsEnabled(LogLevel.Debug))
                _logger.LogDebug(ex, "Metadata probe to {BaseUri} returned invalid JSON", baseUri);
            return null;
        }
        catch (TaskCanceledException ex)
        {
            if (_logger.IsEnabled(LogLevel.Debug))
                _logger.LogDebug(ex, "Metadata probe to {BaseUri} timed out", baseUri);
            return null;
        }
    }

    private sealed record ApplicationMetadataResponse(string Id);
}
