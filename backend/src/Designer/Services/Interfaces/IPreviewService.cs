using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Interface for handling a mocked instance object for preview mode
/// </summary>
public interface IPreviewService
{

    /// <summary>
    /// Creates a mocked instance object with limited data needed to serve app-frontend
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="app">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="instanceOwnerPartyId"></param>
    public Task<Instance> GetMockInstance(string org, string app, string developer, int? instanceOwnerPartyId);

    public Task<DataType> GetDataTypeForTask(string org, string app, string developer, string task);

    public string ConvertTaskNumberToString(int? currentTask);

}
