using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository
{
    /// <summary>
    /// Class representing a application specific git repository.
    /// </summary>
    public class AltinnAppGitRepository : AltinnGitRepository
    {        
        private const string CONFIG_FOLDER_PATH = "App/config/";        
        private const string APP_METADATA_FILENAME = "applicationmetadata.json";

        /// <summary>
        /// Initializes a new instance of the <see cref="AltinnGitRepository"/> class.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="developer">Developer that is working on the repository.</param>
        /// <param name="repositoriesRootDirectory">Base path (full) for where the repository recides on-disk.</param>
        /// <param name="repositoryDirectory">Full path to the root directory of this repository on-disk.</param>
        public AltinnAppGitRepository(string org, string repository, string developer, string repositoriesRootDirectory, string repositoryDirectory) : base(org, repository, developer, repositoriesRootDirectory, repositoryDirectory)
        {
        }

        /// <summary>
        /// Gets the application metadata.
        /// </summary>    
        public async Task<Application> GetApplicationMetadata()
        {            
            var appMetadataRealtiveFilePath = Path.Combine(CONFIG_FOLDER_PATH, APP_METADATA_FILENAME);
            var fileContent = await ReadTextByRelativePathAsync(appMetadataRealtiveFilePath);

            return JsonConvert.DeserializeObject<Application>(fileContent);            
        }
    }
}
