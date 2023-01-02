using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces
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
        /// <param name="appOwner">Application ownwer.</param>
        /// <returns></returns>
        Task UpdateReleaseStatus(string buildNumber, string appOwner);

        /// <summary>
        /// Updates the deployment status in db
        /// </summary>
        /// <param name="buildNumber">Azure DevOps build number</param>
        /// <param name="appOwner">Application ownwer.</param>
        /// <returns></returns>
        Task UpdateDeploymentStatus(string buildNumber, string appOwner);
    }
}
