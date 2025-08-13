using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Admin.Models;

namespace Altinn.Studio.Admin.Services.Interfaces;

/// <summary>
/// Interface for interacting with the Altinn Storage service.
/// Provides methods to retrieve instances and their associated data elements.
/// </summary>
public interface IStorageService
{
    /// <summary>
    /// Retrieves a list of all instances for the specified organization, environment, and application.
    /// Note that each instance is returned as a <see cref="SimpleInstance"/> object, which contains only
    /// a subset of information from the actual instance documents. For more complete details about each
    /// instance, you will need to retrieve the full instance document separately.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <param name="env">The environment identifier.</param>
    /// <param name="app">The application identifier.</param>
    /// <returns>The task result contains a list of <see cref="SimpleInstance"/> objects representing the instances.
    /// </returns>
    public Task<InstancesResponse> GetInstances(
        string org,
        string env,
        string app,
        string? continuationToken,
        CancellationToken ct
    );

    /// <summary>
    /// Retrieves an instance by its ID within a specified organization and environment.
    /// Throws if the instance was not found.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <param name="env">The environment identifier.</param>
    /// <param name="instanceId">The unique ID of the instance to retrieve.</param>
    /// <returns>The task result contains an Instance object with details about the specified instance if found.
    /// </returns>
    public Task<Instance> GetInstance(
        string org,
        string env,
        string instanceId,
        CancellationToken ct
    );

    /// <summary>
    /// Retrieves an instance data element.
    /// The returned stream contains the data, and the strings represent the content-type of that data and the filename.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <param name="env">The environment identifier.</param>
    /// <param name="instanceId">The instance identifier.</param>
    /// <param name="dataElementId">The data element identifier.</param>
    /// <returns>A task whose result contains a tuple where:
    ///   - Item1 is a Stream containing the data.
    ///   - Item2 is a string representing the content-type of the data.
    ///   - Item3 is a nullable string representing the filename associated with the data.</returns>
    public Task<(Stream, string, string?)> GetInstanceDataElement(
        string org,
        string env,
        string instanceId,
        string dataElementId,
        CancellationToken ct
    );

    /// <summary>
    /// Retrieves the process history for an instance.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <param name="env">The environment identifier.</param>
    /// <param name="instanceId">The instance ID.</param>
    /// <returns>The task result contains a list of process history items.</returns>
    public Task<List<ProcessHistoryItem>> GetProcessHistory(
        string org,
        string env,
        string instanceId,
        CancellationToken ct
    );

    /// <summary>
    /// Retrieves the list of instance events for an instance.
    /// </summary>
    /// <param name="org">The organization identifier.</param>
    /// <param name="env">The environment identifier.</param>
    /// <param name="instanceId">The unique identifier of the instance.</param>
    /// <returns>The task result contains a list of instance events.</returns>
    public Task<List<InstanceEvent>> GetInstanceEvents(
        string org,
        string env,
        string instanceId,
        CancellationToken ct
    );
}
