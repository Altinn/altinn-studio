using System.Threading;
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
    /// <param name="instanceOwnerPartyId">Id for instance owner party</param>
    /// <param name="layoutSetName">Name of current layout set to view</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<Instance> GetMockInstance(string org, string app, string developer, int? instanceOwnerPartyId, string layoutSetName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the datatype object with the datamodel name and datatype id based on the current layout set name
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="app">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="layoutSetName">Name of current layout set to view</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<DataType> GetDataTypeForLayoutSetName(string org, string app, string developer, string layoutSetName, CancellationToken cancellationToken = default);

}
