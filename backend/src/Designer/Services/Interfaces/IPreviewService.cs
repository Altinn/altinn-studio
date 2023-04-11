using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Interface for handling a mocked instance object for preview mode
/// </summary>
public interface IPreviewService
{
    /// <summary>
    /// Gets the application metadata as application object from platform models
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="app">Repository</param>
    /// <param name="developer">Username of developer</param>
    public Task<Application> GetApplication(string org, string app, string developer);

    /// <summary>
    /// Creates a mocked instance object with limited data needed to serve app-frontend
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="app">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="instanceOwnerPartyId"></param>
    public Task<Instance> CreateMockInstance(string org, string app, string developer, int? instanceOwnerPartyId);

    /// <summary>
    /// Gets the datatype from application metadata that corresponds to the process Task_1
    /// which is default task id for apps without layoutset
    /// </summary>
    /// <param name="org"></param>
    /// <param name="app"></param>
    /// <param name="developer"></param>
    /// <returns></returns>
    public Task<DataType> GetDataTypeForTask1(string org, string app, string developer);
}
