#nullable disable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Repository
{
    /// <summary>
    /// Interface for deploy event repository
    /// </summary>
    public interface IDeployEventRepository
    {
        /// <summary>
        /// Adds a deploy event to a deployment
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="buildId">Azure DevOps build ID</param>
        /// <param name="deployEvent">The deploy event to add</param>
        /// <param name="cancellationToken">Cancellation token</param>
        Task AddAsync(string org, string buildId, DeployEvent deployEvent, CancellationToken cancellationToken = default);
    }
}