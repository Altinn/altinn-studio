#nullable disable
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// IApplicationInformationService
    /// </summary>
    public interface IApplicationInformationService
    {
        /// <summary>
        /// Updates all relevant application information on a new deployment
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application</param>
        /// <param name="shortCommitId">Commit Id</param>
        /// <param name="envName">Environment Name</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        Task UpdateApplicationInformationAsync(
            string org,
            string app,
            string shortCommitId,
            string envName,
            CancellationToken cancellationToken = default);
    }
}
