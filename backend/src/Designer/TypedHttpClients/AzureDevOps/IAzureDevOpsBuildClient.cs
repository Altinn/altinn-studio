using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps
{
    /// <summary>
    /// Interface for communication with Azure DevOps
    /// </summary>
    public interface IAzureDevOpsBuildClient
    {
        /// <summary>
        /// Queues a build with a certain build definition id
        /// </summary>
        /// <param name="queueBuildParameters">QueueBuildParameters</param>
        /// <param name="buildDefinitionId">int</param>
        /// <returns>The queued Build</returns>
        Task<Build> QueueAsync(
            QueueBuildParameters queueBuildParameters,
            int buildDefinitionId);

        /// <summary>
        /// Gets a build by buildId
        /// </summary>
        /// <param name="buildId">string</param>
        /// <returns></returns>
        Task<Build> Get(string buildId);
    }
}
