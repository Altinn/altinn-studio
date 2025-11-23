#nullable disable
using Altinn.Studio.Designer.Infrastructure.GitRepository;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Interface for handling the creation of AltinnGitRepository instances.
    /// </summary>
    public interface IAltinnGitRepositoryFactory
    {
        /// <summary>
        /// Creates an instance of <see cref="AltinnGitRepository"/>
        /// </summary>
        /// <param name="org">The organization owning the repository identified by its short name as defined in Gitea.</param>
        /// <param name="repository">The name of the repository as specified in Gitea.</param>
        /// <param name="developer">The user name of the developer working on the repository.</param>
        AltinnGitRepository GetAltinnGitRepository(string org, string repository, string developer);

        /// <summary>
        /// Creates an instance of <see cref="AltinnAppGitRepository"/>
        /// </summary>
        /// <param name="org">The organization owning the repository identified by its short name as defined in Gitea.</param>
        /// <param name="repository">The name of the repository as specified in Gitea.</param>
        /// <param name="developer">The user name of the developer working on the repository.</param>
        AltinnAppGitRepository GetAltinnAppGitRepository(string org, string repository, string developer);

        /// <summary>
        /// Creates an instance of <see cref="AltinnOrgGitRepository"/>
        /// </summary>
        /// <param name="org">The organization owning the repository identified by its short name as defined in Gitea.</param>
        /// <param name="repository">The name of the repository as specified in Gitea.</param>
        /// <param name="developer">The user name of the developer working on the repository.</param>
        AltinnOrgGitRepository GetAltinnOrgGitRepository(string org, string repository, string developer);

        /// <summary>
        /// Gets the full path to a repository.
        /// </summary>
        /// <param name="org">The organisation owning the repository, identified by its short name.</param>
        /// <param name="repository">The name of the repository</param>
        /// <param name="developer">The developer's user name associated with the repository.</param>
        /// <returns>The full, OS-normalized path to the root directory of the repository.</returns>
        string GetRepositoryPath(string org, string repository, string developer);
    }
}
