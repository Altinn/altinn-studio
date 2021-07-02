using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository
{
    /// <summary>
    /// Class representing a application specific git repository.
    /// </summary>
    public class AltinnAppGitRepository : AltinnGitRepository
    {
        private const string MODEL_METADATA_FOLDER_PATH = "App/models/";
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

        /// <summary>
        /// Updates the application metadata file.
        /// </summary>
        /// <param name="applicationMetadata">The updated application metadata to persist.</param>
        public async Task UpdateApplicationMetadata(Application applicationMetadata)
        {
            string metadataAsJson = JsonConvert.SerializeObject(applicationMetadata, Formatting.Indented);
            var appMetadataRealtiveFilePath = Path.Combine(CONFIG_FOLDER_PATH, APP_METADATA_FILENAME);

            await WriteTextByRelativePathAsync(appMetadataRealtiveFilePath, metadataAsJson, true);
        }

        /// <summary>
        /// Updates the model metadata model for the application (a JSON where the model hierarchy is flatten,
        /// in order to easier generate the C# class).
        /// </summary>
        /// <param name="modelMetadata">Model metadata to persist.</param>
        /// <param name="modelName">The name of the model. </param>
        /// <returns></returns>
        public async Task UpdateModelMetadata(ModelMetadata modelMetadata, string modelName)
        {
            string metadataAsJson = JsonConvert.SerializeObject(modelMetadata);
            string modelMetadataRelativeFilePath = Path.Combine(MODEL_METADATA_FOLDER_PATH, $"{modelName}.metadata.json");

            await WriteTextByRelativePathAsync(modelMetadataRelativeFilePath, metadataAsJson, true);
        }
    }
}
