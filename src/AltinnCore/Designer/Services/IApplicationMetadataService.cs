using System.Threading.Tasks;

namespace AltinnCore.Designer.Services
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
        /// <param name="commitId">Commit Id</param>
        /// <returns></returns>
        Task RegisterApplicationInStorageAsync(string org, string app, string commitId);
    }
}
