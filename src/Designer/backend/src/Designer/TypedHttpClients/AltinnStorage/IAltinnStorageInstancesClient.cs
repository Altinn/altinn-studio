#nullable enable

using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;

/// <summary>
/// IAltinnStorageInstancesClient
/// </summary>
public interface IAltinnStorageInstancesClient
{
    /// <inheritdoc cref="GetInstances"/>
    Task<QueryResponse<SimpleInstance>> GetInstances(
        string org,
        string env,
        string app,
        string? continuationToken,
        string? currentTaskFilter,
        bool? processIsCompleteFilter,
        CancellationToken ct
    );
}
