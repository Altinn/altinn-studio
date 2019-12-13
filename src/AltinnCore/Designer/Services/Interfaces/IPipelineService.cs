using System.Threading.Tasks;

namespace AltinnCore.Designer.Services.Interfaces
{
    /// <summary>
    /// IPipelineService
    /// </summary>
    public interface IPipelineService
    {
        /// <summary>
        /// Updates the release status in db
        /// </summary>
        /// <param name="buildNumber">Azure DevOps build number</param>
        /// <returns></returns>
        Task UpdateReleaseStatus(string buildNumber);

        /// <summary>
        /// Updates the deployment status in db
        /// </summary>
        /// <param name="buildNumber">Azure DevOps build number</param>
        /// <returns></returns>
        Task UpdateDeploymentStatus(string buildNumber);
    }
}
