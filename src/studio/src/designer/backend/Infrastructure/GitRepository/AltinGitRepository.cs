using System;
using System.IO;
using Altinn.Studio.Designer.Helpers.Extensions;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository
{
    /// <summary>
    /// Class representing a Altinn Git Repository, either an app or a datamodels repository,
    /// ie. the shared properties and functionallity between the different types of repositories.
    /// </summary>
    public class AltinGitRepository
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="AltinGitRepository"/> class.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="developer">Developer that is working on the repository.</param>
        /// <param name="repositoriesRootPath">Base path for where the repository recides on-disk.</param>
        public AltinGitRepository(string org, string repository, string developer, string repositoriesRootPath)
        {            
            AssertNotNullOrEmpty(org, nameof(org));
            AssertNotNullOrEmpty(repository, nameof(repository));
            AssertNotNullOrEmpty(developer, nameof(developer));
            AssertNotNullOrEmpty(repositoriesRootPath, nameof(repositoriesRootPath));
            AssertDirectoryExists(repositoriesRootPath);

            Org = org;
            Repository = repository;
            Developer = developer;
            RepositoriesRootPath = repositoriesRootPath;
        }

        /// <summary>
        /// Short name representing the organization that owns the repository as defined in Gitea.
        /// </summary>
        public string Org { get; private set; }

        /// <summary>
        /// Name of the repository as defined in Gitea.
        /// </summary>
        public string Repository { get; private set; }

        /// <summary>
        /// Short name of the developer, as defined in Gitea, that is working on the repository.
        /// </summary>
        public string Developer { get; private set; }

        /// <summary>
        /// Root path for where the repositories recides on-disk.        
        /// </summary>
        public string RepositoriesRootPath { get; private set; }

        /// <summary>
        /// Gets the full path to the on-disk repository directory based
        /// on basepath, developer, org and repository for the current repository.
        /// </summary>        
        /// <returns>The full path, ending with "/"</returns>
        public string GetRepositoryPath()
        {
            string[] paths = { RepositoriesRootPath, Developer.AsFileName(), Org.AsFileName(), Repository.AsFileName() };
            return Path.Combine(paths);
        }

        private static void AssertNotNullOrEmpty(string paramValue, string paramName)
        {
            if (string.IsNullOrEmpty(paramValue))
            {                
                throw new ArgumentException($"'{paramName}' cannot be null or empty.", nameof(paramName));
            }
        }

        private static void AssertDirectoryExists(string path)
        {
            if (!Directory.Exists(path))
            {
                throw new DirectoryNotFoundException($"Could not find the specified path: {path}");
            }
        }
    }
}
