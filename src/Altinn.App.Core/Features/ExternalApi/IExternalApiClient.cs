using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.ExternalApi;

/// <summary>
/// Interface for providing external api data
/// </summary>
[ImplementableByApps]
public interface IExternalApiClient
{
    /// <summary>
    /// The id/name that is used in the <c>externalApiId</c> parameter in the ExternalApiController
    /// </summary>
    string Id { get; }

    /// <summary>
    /// Fetches data from the external api
    /// </summary>
    /// <param name="instanceIdentifier"></param>
    /// <param name="queryParams"></param>
    /// <returns>An arbitrary object</returns>
    Task<object?> GetExternalApiDataAsync(
        InstanceIdentifier instanceIdentifier,
        Dictionary<string, string> queryParams
    );
}
