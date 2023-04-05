using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Interface for handling texts in new format.
/// </summary>
public interface IPreviewService
{
    /// <summary>
    ///
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="app">Repository</param>
    /// <param name="developer">Username of developer</param>
    public Task<Application> GetApplication(string org, string app, string developer);

    /// <summary>
    ///
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="app">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="instanceOwnerPartyId"></param>
    public Instance CreateMockInstance(string org, string app, string developer, int? instanceOwnerPartyId);
}
