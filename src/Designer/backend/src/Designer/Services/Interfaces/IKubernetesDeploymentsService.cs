using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// The interface for business logic service for kubernetes deployments
    /// </summary>
    public interface IKubernetesDeploymentsService
    {
        /// <summary>
        /// Gets kubernetes deployments
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application name</param>
        /// <param name="ct">Cancellation token</param>
        /// <returns>List of kubernetes deployments for a specific app</returns>
        Task<List<KubernetesDeployment>> GetAsync(string org, string app, CancellationToken ct);

        /// <summary>
        /// Gets kubernetes deployments
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="ct">Cancellation token</param>
        /// <returns>Dictionary of kubernetes deployment grouped by environment name</returns>
        Task<Dictionary<string, List<KubernetesDeployment>>> GetAsync(
            string org,
            CancellationToken ct
        );
    }
}
