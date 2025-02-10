using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
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
        /// <param name="buildParameters">Parameters of the build.</param>
        /// <param name="buildDefinitionId">Build identifier</param>
        /// <typeparam name="T">Class holding parameters of the build.</typeparam>
        /// <returns>The queued Build.</returns>
        Task<Build> QueueAsync<T>(T buildParameters, int buildDefinitionId) where T : class;

        /// <summary>
        /// Gets a build entity by buildId
        /// </summary>
        /// <param name="buildId">string</param>
        /// <returns></returns>
        Task<BuildEntity> Get(string buildId);
    }
}
