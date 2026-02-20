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
        /// Creates a new app folder under the given <paramref name="org">org</paramref> and saves the
        /// given <paramref name="serviceConfig"/>
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="serviceConfig">The ServiceConfiguration to save</param>
        /// <param name="templates">List of templates to use in the service creation</param>
        /// <returns>The repository created in gitea</returns>
        Task<RepositoryClient.Model.Repository> CreateService(string org, ServiceConfiguration serviceConfig, List<CustomTemplateReference> templates);

        /// <summary>
        /// Copies a repository within an organisation
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="sourceRepository">The name of the repository to be copied.</param>
        /// <param name="targetRepository">The name of the new repository.</param>
        /// <param name="developer">Developer's username</param>
        /// <param name="targetOrg">TThe name of the organization in which the repo will be copied. If not set it defaults to <paramref name="org"/></param>
        /// <returns>The repository created in gitea</returns>
        Task<RepositoryClient.Model.Repository> CopyRepository(string org, string sourceRepository, string targetRepository, string developer, string targetOrg = null);

        /// <summary>
        /// Deletes the local repository for the user and makes a new clone of the repo
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <returns>True if the reset was successful, otherwise false.</returns>
        Task<bool> ResetLocalRepository(AltinnRepoEditingContext altinnRepoEditingContext);

        /// <summary>
        /// Saves policy to git repository
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="repo">The app or resource repository</param>
        /// <param name="resourceId">The resourceId if resource repository</param>
        /// <param name="xacmlPolicy">The xacml policyh</param>
        /// <returns></returns>
        Task<bool> SavePolicy(string org, string repo, string resourceId, XacmlPolicy xacmlPolicy);

        /// <summary>
        /// Gets a specific polic for an app or for a generic
        /// </summary>
        /// <param name="org"></param>
        /// <param name="repo"></param>
        /// <param name="resourceId"></param>
        /// <returns></returns>
        XacmlPolicy GetPolicy(string org, string repo, string resourceId);

        /// <summary>
        /// Gets the filepath of the policyfile
        /// </summary>
        /// <param name="org"></param>
        /// <param name="repo"></param>
        /// <param name="resourceId"></param>
        /// <returns></returns>
        string GetPolicyPath(string org, string repo, string resourceId);

        /// <summary>
        /// Gets the widget settings for an app
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <returns>The content as string</returns>
        string GetWidgetSettings(AltinnRepoEditingContext altinnRepoEditingContext);

        /// <summary>
        /// Lists the content of a repository
        /// </summary>
        List<FileSystemObject> GetContents(string org, string repository, string path = "");

        /// <summary>
        /// Lists the ServiceResource files in a repository
        /// </summary>
        Task<List<ServiceResource>> GetServiceResources(string org, string repository, string path = "", CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets a specific ServiceResource based on the identifier
        /// </summary>
        /// <param name="org">The organisation that owns the repository where the resource resides</param>
        /// <param name="repository">The repository where the resource resides</param>
        /// <param name="identifier">The identifier of the resource</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Returns the ServiceResource object with the corresponding identifier</returns>
        Task<ServiceResource> GetServiceResourceById(string org, string repository, string identifier, CancellationToken cancellationToken = default);

        /// <summary>
        /// Update existing ServiceResource in repository
        /// </summary>
        /// <param name="org">The organisation which owns the repository</param>
        /// <param name="id">The id of the resource that should be updated</param>
        /// <param name="updatedResource">The resource that is to be updated</param>
        /// <returns></returns>
        ActionResult UpdateServiceResource(string org, string id, ServiceResource updatedResource);

        /// <summary>
        /// Add new ServiceResource to repository
        /// </summary>
        /// <param name="org">The organisation which owns the repository</param>
        /// <param name="newResource">The new resource that is to be added to the repository</param>
        /// <returns>Status code result of resource creation request: 201 if success, or 409 or 400 on error</returns>
        StatusCodeResult AddServiceResource(string org, ServiceResource newResource);

        /// <summary>
        /// Publishes a specific resource to the ResourceRegistry
        /// </summary>
        /// <param name="org">The organisation that owns the repository</param>
        /// <param name="repository">The repository where the resource resides</param>
        /// <param name="id">The id of the resource that should be published</param>
        /// <param name="env">The environment the resource will be published to</param>
        /// <param name="policy">The policy that goes with the resource</param>
        /// <returns></returns>
        public Task<ActionResult> PublishResource(string org, string repository, string id, string env, string policy = null);

        /// <summary>
        /// Returns the path to the app folder
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns></returns>
        string GetAppPath(string org, string app);

        /// <summary>
        /// Deletes the repository both locally and remotely.
        /// </summary>
        /// <param name="org">The repository owner id.</param>
        /// <param name="repository">The repository name.</param>
        Task DeleteRepository(string org, string repository);
    }
}
