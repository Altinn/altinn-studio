#nullable disable
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
        Task<IEnumerable<DeploymentEntity>> Get(string org, string app, DocumentQueryModel query);

        /// <summary>
        /// Calls a procedure to retrieve deployment entity based on buildId
        /// </summary>
        Task<DeploymentEntity> Get(string org, string buildId);


        /// <summary>
        /// Gets the last deployed entity on environment
        /// </summary>
        Task<DeploymentEntity> GetLastDeployed(string org, string app, string environment);

        /// <summary>
        /// Get all deployments for an app in an environment
        /// </summary>
        Task<IEnumerable<DeploymentEntity>> GetSucceeded(string org, string app, string environment, DocumentQueryModel query);

        /// <summary>
        /// Calls a function to update deployment entity
        /// </summary>
        Task Update(DeploymentEntity deploymentEntity);
    }
}
