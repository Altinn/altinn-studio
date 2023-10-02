using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.DataModeling.Metamodel;
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
        /// Returns the <see cref="ModelMetadata"/> for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The service metadata for an app.</returns>
        Task<ModelMetadata> GetModelMetadata(string org, string app);

        /// <summary>
        /// Deletes the resource for a given language id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The resource language id (for example <code>nb, en</code>)</param>
        /// <returns>A boolean indicating if delete was ok</returns>
        bool DeleteLanguage(string org, string app, string id);

        /// <summary>
        /// Creates a new app folder under the given <paramref name="org">org</paramref> and saves the
        /// given <paramref name="serviceConfig"/>
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="serviceConfig">The ServiceConfiguration to save</param>
        /// <returns>The repository created in gitea</returns>
        Task<RepositoryClient.Model.Repository> CreateService(string org, ServiceConfiguration serviceConfig);

        /// <summary>
        /// Copies a repository within an organisation
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="sourceRepository">The name of the repository to be copied.</param>
        /// <param name="targetRepository">The name of the new repository.</param>
        /// <param name="developer">Developer's username</param>
        /// <returns>The repository created in gitea</returns>
        Task<RepositoryClient.Model.Repository> CopyRepository(string org, string sourceRepository, string targetRepository, string developer);

        /// <summary>
        /// Deletes the local repository for the user and makes a new clone of the repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repositoryName">the name of the local repository to reset</param>
        /// <returns>True if the reset was successful, otherwise false.</returns>
        bool ResetLocalRepository(string org, string repositoryName);

        /// <summary>
        /// Returns the app texts
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <remarks>
        /// Format of the dictionary is: &lt;textResourceElementId &lt;language, textResourceElement&gt;&gt;
        /// </remarks>
        /// <returns>The text resources</returns>
        Dictionary<string, Dictionary<string, TextResourceElement>> GetServiceTexts(string org, string app);

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
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The content as string</returns>
        string GetWidgetSettings(string org, string app);

        /// <summary>
        /// Create a new file in blob storage.
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="repo">The repository</param>
        /// <param name="filepath">The filepath</param>
        /// <param name="stream">Data to be written to blob storage.</param>
        /// <returns>The size of the blob.</returns>
        Task WriteData(string org, string repo, string filepath, Stream stream);

        /// <summary>
        /// Reads a data file from blob storage
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="repo">The repository</param>
        /// <param name="path">Path to be file to read blob storage.</param>
        /// <returns>The stream with the file</returns>
        Task<Stream> ReadData(string org, string repo, string path);

        /// <summary>
        /// Deletes the data element permanently
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="repo">The repository</param>
        /// <param name="path">Path to the file to delete.</param>
        void DeleteData(string org, string repo, string path);

        /// <summary>
        /// Lists the content of a repository
        /// </summary>
        List<FileSystemObject> GetContents(string org, string repository, string path = "");

        /// <summary>
        /// Lists the ServiceResource files in a repository
        /// </summary>
        List<ServiceResource> GetServiceResources(string org, string repository, string path = "");

        /// <summary>
        /// Gets a specific ServiceResource based on the identifier
        /// </summary>
        /// <param name="org">The organisation that owns the repository where the resource resides</param>
        /// <param name="repository">The repository where the resource resides</param>
        /// <param name="identifier">The identifier of the resource</param>
        /// <returns>Returns the ServiceResource object with the corresponding identifier</returns>
        ServiceResource GetServiceResourceById(string org, string repository, string identifier);

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
        /// <returns></returns>
        ActionResult AddServiceResource(string org, ServiceResource newResource);

        /// <summary>
        /// Checks a resource if it has a policy by checking if a policyfile exists in the same folder as the resourcefile.
        /// </summary>
        /// <param name="org">The organisation which owns the repository</param>
        /// <param name="repository">The repository</param>
        /// <param name="resource">The resource which is to be checked for policy</param>
        /// <returns>Returns true if resourcefile has a policyfile along with it. If not, returns false</returns>
        bool ResourceHasPolicy(string org, string repository, ServiceResource resource);

        /// <summary>
        /// Checks if LastChanged and/or CreatedBy was added to the ListviewServiceResource-object. If not sets CreatedBy to the logged in user and LastChanged to current datetime.
        /// </summary>
        /// <param name="serviceResource">The ListviewServiceResource that will be enriched if neccessary</param>
        /// <returns>The enriched ListviewServiceResource-object if CreatedBy and LastChanged was missing, otherwise returns the same object</returns>
        ListviewServiceResource AddLastChangedAndCreatedByIfMissingFromGitea(ListviewServiceResource serviceResource);

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
        ///  Updates application model with new app logic model
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="app">The app</param>
        /// <param name="dataTypeId">The dataTypeId for the new app logic datamodel</param>
        /// <param name="classRef">The class ref</param>
        Task UpdateApplicationWithAppLogicModel(string org, string app, string dataTypeId, string classRef);

        /// <summary>
        /// Deletes the repository both locally and remotely.
        /// </summary>
        /// <param name="org">The repository owner id.</param>
        /// <param name="repository">The repository name.</param>
        Task DeleteRepository(string org, string repository);
    }
}
