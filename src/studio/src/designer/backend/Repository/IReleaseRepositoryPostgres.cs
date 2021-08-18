using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.ViewModels.Request;

namespace Altinn.Studio.Designer.Repository
{
    /// <summary>
    /// Interface
    /// </summary>
    public interface IReleaseRepositoryPostgres
    {
        /// <summary>
        /// Creates an release entity in repository
        /// </summary>
        /// <param name="releaseEntity">the release entity object</param>
        /// <returns>releaseEntity</returns>
        Task<ReleaseEntity> Create(ReleaseEntity releaseEntity);

        /// <summary>
        /// Calls a procedure to retrieve release entities based on query params
        /// </summary>
        Task<IEnumerable<ReleaseEntity>> Get(DocumentQueryModel query);

        /// <summary>
        /// Calls a procedure to retrieve release entities based on buildId
        /// </summary>
        Task<IEnumerable<ReleaseEntity>> Get(string org, string app, string tagName, List<string> buildStatus, List<string> buildResult);

        /// <summary>
        /// Calls a procedure to retrieve release entity based on buildId
        /// </summary>
        Task<IEnumerable<ReleaseEntity>> Get(string org, string buildId);

        /// <summary>
        /// Calls a procedure to retrieve succedded release entity
        /// </summary>
        Task<ReleaseEntity> GetSucceededReleaseFromDb(string org, string app, string tagName);
        
        /// <summary>
        /// Calls a function to update release entity
        /// </summary>
        Task Update(ReleaseEntity releaseEntity);
    }
}