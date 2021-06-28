using System.IO;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Factories
{
    /// <summary>
    /// Factory class for creating <see cref="AltinnGitRepository"/> objects.
    /// </summary>
    public class AltinnGitRepositoryFactory : IAltinnGitRepositoryFactory
    {
        private readonly string _repositoriesRootDirectory;

        /// <summary>
        /// Initializes a new instance of the <see cref="AltinnGitRepositoryFactory"/> class.
        /// </summary>
        /// <param name="serviceRepositorySettings">Settings controlling the where to find the repositories (using the value <see cref="ServiceRepositorySettings.RepositoryLocation"/>.</param>
        public AltinnGitRepositoryFactory(IOptions<ServiceRepositorySettings> serviceRepositorySettings) : this(serviceRepositorySettings.Value.RepositoryLocation)
        {            
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="AltinnGitRepositoryFactory"/> class.
        /// </summary>
        /// <param name="repositoriesRootDirectory">Full path to the root directory wher the repositories recides on-disk.</param>
        public AltinnGitRepositoryFactory(string repositoriesRootDirectory)
        {
            _repositoriesRootDirectory = Path.GetFullPath(repositoriesRootDirectory); // We do this to normalize the path according to the OS and avoid slashes in all directions.
        }

        /// <summary>
        /// Creates an instance of <see cref="IAltinnGitRepository"/>
        /// </summary>        
        /// <returns><see cref="IAltinnGitRepository"/></returns>
        public AltinnGitRepository GetRepository(string org, string repository, string developer)
        {
            var repositoryDirectory = GetRepositoryPath(org, repository, developer);
            return new AltinnGitRepository(org, repository, developer, _repositoriesRootDirectory, repositoryDirectory);
        }

        /// <summary>
        /// Gets the full path to a repository.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="developer">Developer that is working on the repository.</param>
        /// <returns>Returns the full, OS normalized, path to the root directory of the repository.</returns>
        public string GetRepositoryPath(string org, string repository, string developer)
        {
            string[] paths = { _repositoriesRootDirectory, developer.AsFileName(), org.AsFileName(), repository.AsFileName() };
            return Path.Combine(paths);
        }
    }
}
