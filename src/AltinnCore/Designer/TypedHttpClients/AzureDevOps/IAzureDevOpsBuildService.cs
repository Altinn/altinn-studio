using System.Threading.Tasks;

namespace AltinnCore.Designer.TypedHttpClients.AzureDevOps
{
    /// <summary>
    /// Interface for communication with Azure DevOps
    /// </summary>
    public interface IAzureDevOpsBuildService
    {
        /// <summary>
        /// Queues a build with a certain build definition id
        /// </summary>
        /// <param name="commitId">Commit id that the build bases itself on</param>
        /// <param name="org">Organisation</param>
        /// <param name="app">App</param>
        /// <param name="deployToken">App deploy token</param>
        /// <returns></returns>
        Task<string> QueueAsync(string commitId, string org, string app, string deployToken);
    }
}
