using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.ModelMetadatalModels;

using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository
{
    /// <summary>
    /// Class representing a application specific git repository.
    /// </summary>
    /// <remarks>This class knows that the repository is an Altinn application and hence knows
    /// about folders and file names and can map them to their respective models.
    /// It shoud however, not have any business logic. The <see cref="GetTextResourcesForAllLanguages"/> method is borderline
    /// as it merges multiple on-disk models into another structure.</remarks>
    public class AltinnAppGitRepository : AltinnGitRepository
    {
        private const string MODEL_FOLDER_PATH = "App/models/";
        private const string CONFIG_FOLDER_PATH = "App/config/";
        private const string LANGUAGE_RESOURCE_FOLDER_NAME = "texts/";

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
            string modelMetadataRelativeFilePath = Path.Combine(MODEL_FOLDER_PATH, $"{modelName}.metadata.json");

            await WriteTextByRelativePathAsync(modelMetadataRelativeFilePath, metadataAsJson, true);
        }

        /// <summary>
        /// Updates the generated C# classes for the application model.
        /// </summary>
        /// <param name="csharpClasses">All C# classes that should be percisted (in one file).</param>
        /// <param name="modelName">The name of the model, will be used as filename.</param>
        /// <returns></returns>
        public async Task UpdateCSharpClasses(string csharpClasses, string modelName)
        {
            string modelMetadataRelativeFilePath = Path.Combine(MODEL_FOLDER_PATH, $"{modelName}.cs");

            await WriteTextByRelativePathAsync(modelMetadataRelativeFilePath, csharpClasses, true);
        }

        /// <summary>
        /// Updates the Json Schema file representing the application model.
        /// </summary>
        /// <param name="jsonSchema">The Json Schema that should be persisted</param>
        /// <param name="modelName">The name of the model without extensions. This will be used as filename.</param>
        /// <returns>A string containging the relative path to the file saved.</returns>
        public async Task<string> SaveJsonSchema(string jsonSchema, string modelName)
        {
            string relativeFilePath = GetRelativeModelFilePath(modelName);

            await WriteTextByRelativePathAsync(relativeFilePath, jsonSchema, true);

            return relativeFilePath;
        }

        /// <summary>
        /// Gets the relative path to a model.
        /// </summary>
        /// <param name="modelName">The name of the model without extensions.</param>
        /// <returns></returns>
        public string GetRelativeModelFilePath(string modelName)
        {
            return Path.Combine(MODEL_FOLDER_PATH, $"{modelName}.schema.json");
        }

        /// <summary>
        /// Gets the folder where the datamodels are stored.
        /// </summary>
        public string GetRelativeModelFolder()
        {
            return MODEL_FOLDER_PATH;
        }

        /// <summary>
        /// Returns a specific text resource based on language code from the application.
        /// </summary>
        /// <remarks>
        /// Format of the dictionary is: &lt;textResourceElementId &lt;language, textResourceElement&gt;&gt;
        /// </remarks>
        public async Task<Designer.Models.TextResource> GetTextResources(string language)
        {
            string resourcePath = Path.Combine(CONFIG_FOLDER_PATH, LANGUAGE_RESOURCE_FOLDER_NAME, $"resource.{language}.json");

            var fileContent = await ReadTextByRelativePathAsync(resourcePath);
            var textResource = JsonConvert.DeserializeObject<Designer.Models.TextResource>(fileContent);

            return textResource;
        }

        /// <summary>
        /// Gets a merged set of all text resources in the application.
        /// </summary>
        /// Format of the dictionary is: &lt;textResourceElementId &lt;language, textResourceElement&gt;&gt;
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        public async Task<Dictionary<string, Dictionary<string, Designer.Models.TextResourceElement>>> GetTextResourcesForAllLanguages()
        {
            var allResourceTexts = new Dictionary<string, Dictionary<string, Designer.Models.TextResourceElement>>();

            string textResourcesDirectory = Path.Combine(CONFIG_FOLDER_PATH, LANGUAGE_RESOURCE_FOLDER_NAME);

            if (!DirectoryExitsByRelativePath(textResourcesDirectory))
            {
                return allResourceTexts;
            }

            string[] files = GetFilesByRelativeDirectory(textResourcesDirectory);

            foreach (string file in files)
            {
                if (!IsValidResourceFile(file))
                {
                    continue;
                }

                string content = await ReadTextByAbsolutePathAsync(file);
                var textResource = JsonConvert.DeserializeObject<Designer.Models.TextResource>(content, new JsonSerializerSettings());
                string language = textResource.Language;

                GetTextResourceForLanguage(allResourceTexts, textResource, language);
            }

            return allResourceTexts;
        }

        private static void GetTextResourceForLanguage(Dictionary<string, Dictionary<string, Designer.Models.TextResourceElement>> allResourceTexts, Designer.Models.TextResource textResource, string language)
        {
            foreach (Designer.Models.TextResourceElement textResourceElement in textResource.Resources)
            {
                string key = textResourceElement.Id;
                string value = textResourceElement.Value;

                if (key == null && value == null)
                {
                    continue;
                }

                if (!allResourceTexts.ContainsKey(key))
                {
                    allResourceTexts.Add(key, new Dictionary<string, Designer.Models.TextResourceElement>());
                }

                if (!allResourceTexts[key].ContainsKey(language))
                {
                    allResourceTexts[key].Add(language, textResourceElement);
                }
            }
        }

        /// <summary>
        /// Save app texts to resource files
        /// </summary>
        /// <param name="allResourceTexts">The texts to be saved</param>
        public async Task SaveServiceTexts(Dictionary<string, Dictionary<string, Designer.Models.TextResourceElement>> allResourceTexts)
        {
            // Language, key, TextResourceElement
            var resourceTexts = new Dictionary<string, Dictionary<string, Designer.Models.TextResourceElement>>();

            foreach (KeyValuePair<string, Dictionary<string, Designer.Models.TextResourceElement>> text in allResourceTexts)
            {
                string textResourceElementId = text.Key;
                foreach (KeyValuePair<string, Designer.Models.TextResourceElement> localizedText in text.Value)
                {
                    string language = localizedText.Key;
                    Designer.Models.TextResourceElement textResourceElement = localizedText.Value;
                    if (!resourceTexts.ContainsKey(language))
                    {
                        resourceTexts.Add(language, new Dictionary<string, Designer.Models.TextResourceElement>());
                    }

                    if (!resourceTexts[language].ContainsKey(textResourceElementId))
                    {
                        resourceTexts[language].Add(textResourceElementId, new Designer.Models.TextResourceElement { Id = textResourceElementId, Value = textResourceElement.Value, Variables = textResourceElement.Variables });
                    }
                }
            }

            string textResourcesDirectory = Path.Combine(CONFIG_FOLDER_PATH, LANGUAGE_RESOURCE_FOLDER_NAME);

            // loop through each language set of text resources
            foreach (KeyValuePair<string, Dictionary<string, Designer.Models.TextResourceElement>> processedResource in resourceTexts)
            {
                var textResource = new Designer.Models.TextResource
                {
                    Language = processedResource.Key,
                    Resources = new List<Designer.Models.TextResourceElement>()
                };

                foreach (KeyValuePair<string, Designer.Models.TextResourceElement> actualResource in processedResource.Value)
                {
                    textResource.Resources.Add(actualResource.Value);
                }

                string resourceString = JsonConvert.SerializeObject(textResource, new JsonSerializerSettings { Formatting = Newtonsoft.Json.Formatting.Indented, NullValueHandling = NullValueHandling.Ignore });
                string resourceFilePath = $"{textResourcesDirectory}/resource.{processedResource.Key}.json";
                await WriteTextByRelativePathAsync(resourceFilePath, resourceString, true);
            }
        }

        private static bool IsValidResourceFile(string filePath)
        {
            var fileName = Path.GetFileName(filePath);
            string[] nameParts = fileName.Split('.');
            if (nameParts.Length == 3 && nameParts[0] == "resource" && nameParts[2] == "json")
            {
                return true;
            }

            return false;
        }
    }
}
