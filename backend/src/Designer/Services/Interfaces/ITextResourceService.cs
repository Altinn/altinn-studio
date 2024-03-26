using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// ITextResourceService
    /// </summary>
    public interface ITextResourceService
    {
        /// <summary>
        /// Registers the text resources connected to a specific GITEA repository on a certain commitId
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application</param>
        /// <param name="shortCommitId">Commit Id</param>
        /// <param name="envName">Environment Name</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        Task UpdateTextResourcesAsync(
            string org,
            string app,
            string shortCommitId,
            string envName,
            CancellationToken cancellationToken = default);
    }
}
