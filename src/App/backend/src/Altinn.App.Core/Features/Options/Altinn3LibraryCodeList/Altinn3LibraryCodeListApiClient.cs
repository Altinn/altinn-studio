using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;

internal sealed class Altinn3LibraryCodeListApiClient : IAltinn3LibraryCodeListApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<Altinn3LibraryCodeListApiClient> _logger;

    public Altinn3LibraryCodeListApiClient(
        HttpClient httpClient,
        IOptions<PlatformSettings> platformSettings,
        ILogger<Altinn3LibraryCodeListApiClient> logger
    )
    {
        httpClient.BaseAddress = new Uri(platformSettings.Value.Altinn3LibraryApiEndpoint);
        httpClient.Timeout = TimeSpan.FromSeconds(30);
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<Altinn3LibraryCodeListResponse> GetAltinn3LibraryCodeList(
        string org,
        string codeListId,
        string version,
        CancellationToken cancellationToken
    )
    {
        try
        {
            using var response = await _httpClient.GetAsync(
                $"{Uri.EscapeDataString(org)}/code_lists/{Uri.EscapeDataString(codeListId)}/{Uri.EscapeDataString(version)}.json",
                cancellationToken
            );

            if (response.StatusCode != HttpStatusCode.OK)
            {
                throw new HttpRequestException(
                    $"Unexpected response from Altinn3Library. Status code: {response.StatusCode}"
                );
            }

            return await JsonSerializerPermissive.DeserializeAsync<Altinn3LibraryCodeListResponse>(
                response.Content,
                cancellationToken
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Exception thrown in GetAltinn3LibraryCodeLists. Code list id: {CodeListId}, Version: {Version}, Org: {Org}",
                LogSanitizer.Sanitize(codeListId),
                LogSanitizer.Sanitize(version),
                LogSanitizer.Sanitize(org)
            );
            throw;
        }
    }
}
