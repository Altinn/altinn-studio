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
        /// <param name="org">The organization owning the repository identfied by it's short name as defined in Gitea.</param>
        /// <param name="repository">The name of the repository as specified in Gitea.</param>
        /// <param name="developer">The user name of the developer working on the repository.</param>
        AltinnGitRepository GetAltinnGitRepository(string org, string repository, string developer);

        /// <summary>
        /// Creates an instance of <see cref="AltinnAppGitRepository"/>
        /// </summary>        
        /// <param name="org">The organization owning the repository identfied by it's short name as defined in Gitea.</param>
        /// <param name="repository">The name of the repository as specified in Gitea.</param>
        /// <param name="developer">The user name of the developer working on the repository.</param>
        AltinnAppGitRepository GetAltinnAppGitRepository(string org, string repository, string developer);
    }
}
