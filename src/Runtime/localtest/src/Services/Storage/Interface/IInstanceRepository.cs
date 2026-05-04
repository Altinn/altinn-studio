using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Repository;

/// <summary>
/// The repository to handle application instances
/// </summary>
public interface IInstanceRepository
{
    /// <summary>
    /// Gets all instances that satisfy given query parameters
    /// </summary>
    /// <param name="queryParams">the query params</param>
    /// <param name="includeDataElements">Whether to include data elements</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The query response including the list of instances</returns>
    Task<InstanceQueryResponse> GetInstancesFromQuery(
        InstanceQueryParameters queryParams,
        bool includeDataElements,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Get an instance for a given instance id
    /// </summary>
    /// <param name="instanceGuid">the instance guid</param>
    /// <param name="includeElements">whether to include data elements</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The instance for the given parameters</returns>
    Task<(Instance Instance, long InternalId)> GetOne(
        Guid instanceGuid,
        bool includeElements,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// insert new instance into collection
    /// </summary>
    /// <param name="instance">the instance to base the new one on</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <param name="altinnMainVersion">the altinn main version</param>
    /// <returns>The instance id</returns>
    Task<Instance> Create(
        Instance instance,
        CancellationToken cancellationToken,
        int altinnMainVersion = 3
    );

    /// <summary>
    /// update existing instance
    /// </summary>
    /// <param name="instance">the instance to update</param>
    /// <param name="updateProperties">a list of which properties should be updated</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>The updated instance</returns>
    Task<Instance> Update(
        Instance instance,
        List<string> updateProperties,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Delets an instance.
    /// </summary>
    /// <param name="instance">The instance to delete</param>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>if the item is deleted or not</returns>
    Task<bool> Delete(Instance instance, CancellationToken cancellationToken);

    /// <summary>
    /// Gets hard deleted instances for cleanup
    /// </summary>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>Hard deleted instances</returns>
    Task<List<Instance>> GetHardDeletedInstances(CancellationToken cancellationToken);

    /// <summary>
    /// Gets hard deleted data elements for cleanup
    /// </summary>
    /// <param name="cancellationToken">CancellationToken</param>
    /// <returns>Hard deleted data elements</returns>
    Task<List<DataElement>> GetHardDeletedDataElements(CancellationToken cancellationToken);
}
