using System;
using System.IO;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository
{
    /// <summary>
    /// Base class for handling files in a Git Repository.
    /// </summary>
    public class GitRepository : IGitRepository
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="GitRepository"/> class.
        /// </summary>        
        /// <param name="repositoriesRootDirectory">Base path (full) for where the repository recides on-disk.</param>
        /// <param name="repositoryDirectory">Full path to the root directory of this repository on-disk.</param>
        public GitRepository(string repositoriesRootDirectory, string repositoryDirectory)
        {            
            Guard.AssertDirectoryExists(repositoriesRootDirectory);
            Guard.AssertDirectoryExists(repositoryDirectory);

            // We do this re-assignment to ensure OS independent paths.
            RepositoriesRootDirectory = Path.GetFullPath(repositoriesRootDirectory);
            RepositoryDirectory = Path.GetFullPath(repositoryDirectory);

            if (!RepositoryDirectory.Contains(RepositoriesRootDirectory))
            {
                throw new ArgumentException($"The repository directory '{RepositoryDirectory}' must be below the repositories root directory '{RepositoriesRootDirectory}'.");
            }
        }

        /// <summary>
        /// Root path for where the repositories recides on-disk.        
        /// </summary>
        public string RepositoriesRootDirectory { get; private set; }

        /// <summary>
        /// Full path to where this particular repository recides on-disk.
        /// </summary>
        public string RepositoryDirectory { get; private set; }
    }
}
