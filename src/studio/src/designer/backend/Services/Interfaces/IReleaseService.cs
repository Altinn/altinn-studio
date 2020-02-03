using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// The interface for business logic service for release
    /// </summary>
    public interface IReleaseService
    {
        /// <summary>
        /// Starts a build in the pipeline
        /// Creates a document in document db
        /// </summary>
        /// <param name="release">Release containing data from client</param>
        /// <returns>The created document in db</returns>
        Task<ReleaseEntity> CreateAsync(ReleaseEntity release);

        /// <summary>
        /// Gets releases based on a query
        /// </summary>
        /// <param name="query">ReleaseQueryModel</param>
        /// <returns>SearchResults of type ReleaseEntity</returns>
        Task<SearchResults<ReleaseEntity>> GetAsync(DocumentQueryModel query);

        /// <summary>
        /// Updates a release document
        /// </summary>
        /// <param name="release">ReleaseDocument</param>
        /// <param name="appOwner">Application owner</param>
        Task UpdateAsync(ReleaseEntity release, string appOwner);
    }
}
