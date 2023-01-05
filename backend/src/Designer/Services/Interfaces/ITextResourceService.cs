using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Models;

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
        /// <param name="environmentModel">EnvironmentModel</param>
        Task UpdateTextResourcesAsync(
            string org,
            string app,
            string shortCommitId,
            EnvironmentModel environmentModel);
    }
}
