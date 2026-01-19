#nullable disable
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Interface for repository functionality
    /// </summary>
    public interface IRepository
    {
        /// <summary>
        /// Deletes the resource for a given language id
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="id">The resource language id (for example <code>nb, en</code>)</param>
        /// <returns>A boolean indicating if delete was ok</returns>
        bool DeleteLanguage(AltinnRepoEditingContext altinnRepoEditingContext, string id);

        /// <summary>
        /// Creates a new app folder under the given <paramref name="authenticatedContext.Org">authenticatedContext.Org</paramref> and saves the
        /// given <paramref name="serviceConfig"/>
        /// </summary>
        /// <param name="authenticatedContext">The authenticated repository editing context</param>
        /// <param name="serviceConfig">The service configuration</param>
        /// <returns>The repository created in gitea</returns>
        Task<RepositoryClient.Model.Repository> CreateService(AltinnAuthenticatedRepoEditingContext authenticatedContext, ServiceConfiguration serviceConfig);

        /// <summary>
        /// Copies a repository within an organisation
        /// </summary>
        /// <param name="authenticatedContext">The authenticated repository editing context</param>
        /// <param name="targetRepository">The name of the new repository.</param>
        /// <param name="targetOrg">The name of the organization in which the repo will be copied. If not set it defaults to <paramref name="authenticatedContext.Org"/></param>
        /// <returns>The repository created in gitea</returns>
        Task<RepositoryClient.Model.Repository> CopyRepository(AltinnAuthenticatedRepoEditingContext authenticatedContext, string targetRepository, string targetOrg = null);

        /// <summary>
        /// Deletes the local repository for the user and makes a new clone of the repo
        /// </summary>
        /// <param name="authenticatedContext">The authenticated repository editing context</param>
        /// <returns>True if the reset was successful, otherwise false.</returns>
        bool ResetLocalRepository(AltinnAuthenticatedRepoEditingContext authenticatedContext);

        /// <summary>
        /// Saves policy to git repository
        /// </summary>
        /// <param name="editingContext">The editing context</param>
        /// <param name="resourceId">The resourceId if resource repository</param>
        /// <param name="xacmlPolicy">The xacml policyh</param>
        /// <returns></returns>
        Task<bool> SavePolicy(AltinnRepoEditingContext editingContext, string resourceId, XacmlPolicy xacmlPolicy);

        /// <summary>
        /// Gets a specific polic for an app or for a generic
        /// </summary>
        /// <param name="editingContext">The editing context</param>
        /// <param name="resourceId">The resourceId if resource repository</param>
        /// <returns></returns>
        XacmlPolicy GetPolicy(AltinnRepoEditingContext editingContext, string resourceId);

        /// <summary>
        /// Gets the filepath of the policyfile
        /// </summary>
        /// <param name="editingContext">The editing context</param>
        /// <param name="resourceId">The resourceId if resource repository</param>
        /// <returns></returns>
        string GetPolicyPath(AltinnRepoEditingContext editingContext, string resourceId);

        /// <summary>
        /// Gets the widget settings for an app
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <returns>The content as string</returns>
        string GetWidgetSettings(AltinnRepoEditingContext altinnRepoEditingContext);

        /// <summary>
        /// Lists the content of a repository
        /// </summary>
        /// <param name="editingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="path">The path within the repository to list contents from</param>
        /// <returns>List of <see cref="FileSystemObject"/></returns>
        List<FileSystemObject> GetContents(AltinnRepoEditingContext editingContext, string path = "");

        /// <summary>
        /// Lists the ServiceResource files in a repository
        /// </summary>
        /// <param name="editingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="path">The path within the repository to list contents from</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Returns a list of <see cref="ServiceResource"/></returns>
        Task<List<ServiceResource>> GetServiceResources(AltinnRepoEditingContext editingContext, string path = "", CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets a specific ServiceResource based on the identifier
        /// </summary>
        /// <param name="editingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="identifier">The identifier of the resource</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Returns the ServiceResource object with the corresponding identifier</returns>
        Task<ServiceResource> GetServiceResourceById(AltinnRepoEditingContext editingContext, string identifier, CancellationToken cancellationToken = default);

        /// <summary>
        /// Update existing ServiceResource in repository
        /// </summary>
        /// <param name="org">The organisation which owns the repository</param>
        /// <param name="id">The id of the resource that should be updated</param>
        /// <param name="developer">The developer making the request</param>
        /// <param name="updatedResource">The resource that is to be updated</param>
        /// <returns></returns>
        ActionResult UpdateServiceResource(string org, string id, string developer, ServiceResource updatedResource);

        /// <summary>
        /// Add new ServiceResource to repository
        /// </summary>
        /// <param name="org">The organisation which owns the repository</param>
        /// <param name="developer">The developer making the request</param>
        /// <param name="newResource">The new resource that is to be added to the repository</param>
        /// <returns>Status code result of resource creation request: 201 if success, or 409 or 400 on error</returns>
        StatusCodeResult AddServiceResource(string org, string developer, ServiceResource newResource);

        /// <summary>
        /// Publishes a specific resource to the ResourceRegistry
        /// </summary>
        /// <param name="editingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="id">The id of the resource that should be published</param>
        /// <param name="env">The environment the resource will be published to</param>
        /// <param name="policy">The policy that goes with the resource</param>
        /// <returns></returns>
        public Task<ActionResult> PublishResource(AltinnRepoEditingContext editingContext, string id, string env, string policy = null);

        /// <summary>
        /// Returns the path to the app folder
        /// </summary>
        /// <param name="editingContext">The editing context</param>
        /// <returns></returns>
        string GetAppPath(AltinnRepoEditingContext editingContext);

        /// <summary>
        /// Deletes the repository both locally and remotely.
        /// </summary>
        /// <param name="editingContext">The editing context</param>
        Task DeleteRepository(AltinnRepoEditingContext editingContext);
    }
}
