using Altinn.Studio.Designer.Infrastructure.GitRepository;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Interface for handling the creation of AltinnGitRepository instances.
    /// </summary>
    public interface IAltinnGitRepositoryFactory
    {
        /// <summary>
        /// Creates an instance of <see cref="IAltinnGitRepository"/>
        /// </summary>        
        /// <param name="org">The organization owning the repository identfied by it's short name as defined in Gitea.</param>
        /// <param name="repository">The name of the repository as specified in Gitea.</param>
        /// <param name="developer">The user name of the developer working on the repository.</param>
        /// <returns><see cref="IAltinnGitRepository"/></returns>
        AltinnGitRepository GetRepository(string org, string repository, string developer);
    }
}
