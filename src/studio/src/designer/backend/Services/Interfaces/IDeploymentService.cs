using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;

namespace Altinn.Studio.Designer.Services.Interfaces
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
        /// <param name="appOwner">Application ownwer.</param>
        Task UpdateAsync(DeploymentEntity deployment, string appOwner);
    }
}
