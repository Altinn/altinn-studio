using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// IApplicationMetadataService
    /// </summary>
    public interface IApplicationMetadataService
    {
        /// <summary>
        /// Registers the metadata connected to a specific GITEA repository on a certain commitId
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application</param>
        /// <param name="fullCommitId">Commit Id</param>
        /// <param name="deploymentEnvironment">EnvironmentModel</param>
        Task UpdateApplicationMetadataAsync(
            string org,
            string app,
            string fullCommitId,
            EnvironmentModel deploymentEnvironment);
    }
}
