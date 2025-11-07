#nullable disable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
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
        /// <param name="org">Organisation</param>
        /// <param name="app">Application name</param>
        /// <param name="deployment">Release containing data from client</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The created document in db</returns>
        Task<DeploymentEntity> CreateAsync(string org, string app, DeploymentModel deployment, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets deployments
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application name</param>
        /// <param name="query">DocumentQueryModel</param>
        /// <returns>SearchResults of type DeploymentEntity</returns>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        Task<SearchResults<DeploymentEntity>> GetAsync(string org, string app, DocumentQueryModel query, CancellationToken cancellationToken = default);

        /// <summary>
        /// Updates a deployment entity
        /// </summary>
        /// <param name="buildNumber">Azure DevOps build number</param>
        /// <param name="appOwner">Application owner.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        Task UpdateAsync(string buildNumber, string appOwner, CancellationToken cancellationToken = default);


        /// <summary>
        /// Undeploys an application from a specified environment.
        /// </summary>
        /// <param name="editingContext"> An <see cref="AltinnRepoEditingContext"/> holding the data about editing context.</param>
        /// <param name="env">The environment from which the application should be undeployed.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if the operation is cancelled.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        /// <remarks>
        /// This method handles the undeploy of an application from the specified environment.
        /// </remarks>
        Task UndeployAsync(AltinnRepoEditingContext editingContext, string env, CancellationToken cancellationToken = default);
    }
}
