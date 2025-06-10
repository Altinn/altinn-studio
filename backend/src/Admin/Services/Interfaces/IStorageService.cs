using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Admin.Models;

namespace Altinn.Studio.Admin.Services.Interfaces;

public interface IStorageService
{
    public Task<List<SimpleInstance>> GetInstances(string org, string env, string app);

    public Task<Instance> GetInstance(string org, string env, string instanceId);

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
        string dataElementId
    );
}
