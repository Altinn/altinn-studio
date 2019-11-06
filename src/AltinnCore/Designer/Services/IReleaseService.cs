using System.Threading.Tasks;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.ViewModels.Request;
using AltinnCore.Designer.ViewModels.Response;

namespace AltinnCore.Designer.Services
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
        Task UpdateAsync(ReleaseEntity release);
    }
}
