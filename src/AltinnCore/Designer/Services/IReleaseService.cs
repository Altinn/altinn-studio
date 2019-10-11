using System.Collections.Generic;
using System.Threading.Tasks;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.ViewModels.Request;

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
        Task<ReleaseDocument> Create(ReleaseDocument release);

        /// <summary>
        /// Gets releases based on a query
        /// </summary>
        /// <param name="query">ReleaseQueryModel</param>
        /// <returns></returns>
        Task<IEnumerable<ReleaseDocument>> Get(DocumentQueryModel query);
    }
}
