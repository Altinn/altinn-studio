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
        /// <param name="authenticatedContext"> An <see cref="AltinnAuthenticatedRepoEditingContext"/> holding the data about editing context.</param>
        /// <param name="app">Application name</param>
        /// <param name="deployment">Release containing data from client</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The created document in db</returns>
        Task<DeploymentEntity> CreateAsync(AltinnAuthenticatedRepoEditingContext authenticatedContext, string app, DeploymentModel deployment, CancellationToken cancellationToken = default);
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
        /// Undeploys an application from a specified environment.
        /// </summary>
        /// <param name="authenticatedContext"> An <see cref="AltinnAuthenticatedRepoEditingContext"/> holding the data about editing context.</param>
        /// <param name="env">The environment from which the application should be undeployed.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if the operation is cancelled.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        /// <remarks>
        /// This method handles the undeploy of an application from the specified environment.
        /// </remarks>
        Task UndeployAsync(AltinnAuthenticatedRepoEditingContext authenticatedContext, string env, CancellationToken cancellationToken = default);

        /// <summary>
        /// Publishes the sync-root GitOps OCI image to the container registry.
        /// </summary>
        /// <param name="editingContext">An <see cref="AltinnOrgEditingContext"/> holding the data about the org editing context.</param>
        /// <param name="environment">The environment for which to publish the sync-root image.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if the operation is cancelled.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task PublishSyncRootAsync(AltinnOrgEditingContext editingContext, AltinnEnvironment environment, CancellationToken cancellationToken = default);
    }
}
