using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.ViewModels.Request;

namespace Altinn.Studio.Designer.Repository
{
    /// <summary>
    /// Interface
    /// </summary>
    public interface IDeploymentRepository
    {
        /// <summary>
        /// Creates an deployment entity in repository
        /// </summary>
        /// <param name="deploymentEntity">the deployment entity object</param>
        /// <returns>deploymentEntity</returns>
        Task<DeploymentEntity> Create(DeploymentEntity deploymentEntity);

        /// <summary>
        /// Calls a procedure to retrieve deployment entities based on query params
        /// </summary>
        Task<IEnumerable<DeploymentEntity>> Get(DocumentQueryModel query);

        /// <summary>
        /// Calls a procedure to retrieve deployment entity based on buildId
        /// </summary>
        Task<DeploymentEntity> Get(string org, string buildId);

        /// <summary>
        /// Calls a function to update deployment entity
        /// </summary>
        Task Update(DeploymentEntity deploymentEntity);
    }
}
