using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.ExternalApi;

/// <summary>
/// Result of external api data retrieval
/// </summary>
public sealed record ExternalApiDataResult(object? Data, bool WasExternalApiFound);

/// <summary>
/// Interface for handling external api data
/// </summary>
public interface IExternalApiService
{
    /// <summary>
    /// Get data for an external api
    /// </summary>
    /// <param name="externalApiId"></param>
    /// <param name="instanceIdentifier"></param>
    /// <param name="queryParams"></param>
    /// <returns>An arbitrary json data object</returns>
    Task<ExternalApiDataResult> GetExternalApiData(
        string externalApiId,
        InstanceIdentifier instanceIdentifier,
        Dictionary<string, string> queryParams
    );
}

/// <summary>
/// Service for handling external api data
/// </summary>
public class ExternalApiService(ILogger<ExternalApiService> logger, IServiceProvider serviceProvider)
    : IExternalApiService
{
    private readonly ILogger<ExternalApiService> _logger = logger;
    private readonly IExternalApiFactory _externalApiFactory =
        serviceProvider.GetRequiredService<IExternalApiFactory>();

    /// <inheritdoc/>
    public async Task<ExternalApiDataResult> GetExternalApiData(
        string externalApiId,
        InstanceIdentifier instanceIdentifier,
        Dictionary<string, string> queryParams
    )
    {
        var externalApiClient = _externalApiFactory.GetExternalApiClient(externalApiId);
        if (externalApiClient is null)
        {
            _logger.LogWarning("External api with id {ExternalApiId} not found", externalApiId);
            return new ExternalApiDataResult(null, false);
        }

        _logger.LogInformation("Getting data from external api with id {ExternalApiId}", externalApiId);
        var result = await externalApiClient.GetExternalApiDataAsync(instanceIdentifier, queryParams);
        return new ExternalApiDataResult(result, true);
    }
}
