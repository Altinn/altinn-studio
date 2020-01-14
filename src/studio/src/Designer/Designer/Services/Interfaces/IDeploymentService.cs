using System.Threading.Tasks;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.Services.Models;
using AltinnCore.Designer.ViewModels.Request;
using AltinnCore.Designer.ViewModels.Response;

namespace AltinnCore.Designer.Services.Interfaces
{
    /// <summary>
    /// The interface for business logic service for deployment
    /// </summary>
    public interface IDeploymentService
    {
        /// <summary>
        /// Starts a deployment in the pipeline
        /// Creates a document in document db
        /// </summary>
        /// <param name="deployment">Release containing data from client</param>
        /// <returns>The created document in db</returns>
        Task<DeploymentEntity> CreateAsync(DeploymentModel deployment);

        /// <summary>
        /// Gets deployments
        /// </summary>
        /// <param name="query">DcumentQueryModel</param>
        /// <returns>SearchResults of type DeploymentEntity</returns>
        Task<SearchResults<DeploymentEntity>> GetAsync(DocumentQueryModel query);

        /// <summary>
        /// Updates a deployment entity
        /// </summary>
        /// <param name="deployment">DeploymentEntity</param>
        Task UpdateAsync(DeploymentEntity deployment);
    }
}
