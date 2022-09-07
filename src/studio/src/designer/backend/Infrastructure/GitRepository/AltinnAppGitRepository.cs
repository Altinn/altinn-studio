using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.ModelMetadatalModels;

using Microsoft.AspNetCore.Mvc;

using Newtonsoft.Json;
using Formatting = Newtonsoft.Json.Formatting;

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
        /// <param name="repositoriesRootDirectory">Base path (full) for where the repository resides on-disk.</param>
        /// <param name="repositoryDirectory">Full path to the root directory of this repository on-disk.</param>
        public AltinnAppGitRepository(string org, string repository, string developer, string repositoriesRootDirectory, string repositoryDirectory) : base(org, repository, developer, repositoriesRootDirectory, repositoryDirectory)
        {
        }

        /// <summary>
        /// Gets the application metadata.
        /// </summary>
        public async Task<Application> GetApplicationMetadata()
        {
            var appMetadataRelativeFilePath = Path.Combine(CONFIG_FOLDER_PATH, APP_METADATA_FILENAME);
            var fileContent = await ReadTextByRelativePathAsync(appMetadataRelativeFilePath);

            return JsonConvert.DeserializeObject<Application>(fileContent);
        }

        /// <summary>
        /// Saves the application metadata file to disk.
        /// </summary>
        /// <param name="applicationMetadata">The updated application metadata to persist.</param>
        public async Task SaveApplicationMetadata(Application applicationMetadata)
        {
            string metadataAsJson = JsonConvert.SerializeObject(applicationMetadata, Formatting.Indented);
            var appMetadataRelativeFilePath = Path.Combine(CONFIG_FOLDER_PATH, APP_METADATA_FILENAME);

            await WriteTextByRelativePathAsync(appMetadataRelativeFilePath, metadataAsJson, true);
        }

        /// <summary>
        /// Saves the model metadata model for the application (a JSON where the model hierarchy is flatten,
        /// in order to easier generate the C# class) to disk.
        /// </summary>
        /// <param name="modelMetadata">Model metadata to persist.</param>
        /// <param name="modelName">The name of the model. </param>
        public async Task SaveModelMetadata(ModelMetadata modelMetadata, string modelName)
        {
            string metadataAsJson = JsonConvert.SerializeObject(modelMetadata);
            string modelMetadataRelativeFilePath = Path.Combine(MODEL_FOLDER_PATH, $"{modelName}.metadata.json");

            await WriteTextByRelativePathAsync(modelMetadataRelativeFilePath, metadataAsJson, true);
        }

        /// <summary>
        /// Saves the generated C# classes for the application model to disk.
        /// </summary>
        /// <param name="csharpClasses">All C# classes that should be persisted (in one file).</param>
        /// <param name="modelName">The name of the model, will be used as filename.</param>
        public async Task SaveCSharpClasses(string csharpClasses, string modelName)
        {
            string modelMetadataRelativeFilePath = Path.Combine(MODEL_FOLDER_PATH, $"{modelName}.cs");

            await WriteTextByRelativePathAsync(modelMetadataRelativeFilePath, csharpClasses, true);
        }

        /// <summary>
        /// Saves the Json Schema file representing the application model to disk.
        /// </summary>
        /// <param name="jsonSchema">The Json Schema that should be persisted</param>
        /// <param name="modelName">The name of the model without extensions. This will be used as filename.</param>
        /// <returns>A string containing the relative path to the file saved.</returns>
        public async Task<string> SaveJsonSchema(string jsonSchema, string modelName)
        {
            string relativeFilePath = GetRelativeModelFilePath(modelName);

            await WriteTextByRelativePathAsync(relativeFilePath, jsonSchema, true);

            return relativeFilePath;
        }

        /// <summary>
        /// Saves the Xsd to the disk.
        /// </summary>
        /// <param name="xsdMemoryStream">Stream representing the Xsd to be saved.</param>
        /// <param name="fileName">The filename of the file to be saved excluding path.</param>
        /// <returns>A string containg the relative path to the file saved.</returns>
        public async Task<string> SaveXsd(MemoryStream xsdMemoryStream, string fileName)
        {
            string filePath = Path.Combine(GetRelativeModelFolder(), fileName);
            xsdMemoryStream.Position = 0;
            await WriteStreamByRelativePathAsync(filePath, xsdMemoryStream, true);
            xsdMemoryStream.Position = 0;

            return filePath;
        }

        /// <summary>
        /// Saves the Xsd to the disk.
        /// </summary>
        /// <param name="xsd">String representing the Xsd to be saved.</param>
        /// <param name="fileName">The filename of the file to be saved excluding path.</param>
        /// <returns>A string containg the relative path to the file saved.</returns>
        public async Task<string> SaveXsd(string xsd, string fileName)
        {
            string filePath = Path.Combine(GetRelativeModelFolder(), fileName);
            await WriteTextByRelativePathAsync(filePath, xsd, true);

            return filePath;
        }

        /// <summary>
        /// Saves the Xsd to the disk.
        /// </summary>
        /// <param name="xmlSchema">Xml schema to be saved.</param>
        /// <param name="fileName">The filename of the file to be saved excluding path.</param>
        /// <returns>A string containg the relative path to the file saved.</returns>
        public async Task<string> SaveXsd(XmlSchema xmlSchema, string fileName)
        {
            string xsd = await SerializeXsdToString(xmlSchema);

            return await SaveXsd(xsd, fileName);
        }

        /// <summary>
        /// Gets the relative path to a model.
        /// </summary>
        /// <param name="modelName">The name of the model without extensions.</param>
        /// <returns>A string with the relative path to the model file, including file extension. </returns>
        public string GetRelativeModelFilePath(string modelName)
        {
            return Path.Combine(MODEL_FOLDER_PATH, $"{modelName}.schema.json");
        }

        /// <summary>
        /// Gets the folder where the data models are stored.
        /// </summary>
        /// <returns>A string with the relative path to the model folder within the app.</returns>
        public string GetRelativeModelFolder()
        {
            return MODEL_FOLDER_PATH;
        }

        /// <summary>
        /// Returns a specific text resource written in the old text format
        /// based on language code from the application.
        /// </summary>
        /// <remarks>
        /// Format of the dictionary is: &lt;textResourceElementId &lt;language, textResourceElement&gt;&gt;
        /// </remarks>
        public async Task<Designer.Models.TextResource> GetTextV1(string language)
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
        /// Reads text file from disk written in the new text format
        /// identified by the languageCode in filename.
        /// </summary>
        /// <param name="languageCode">Language identifier</param>
        /// <returns>Text as a string</returns>
        public async Task<string> GetTextV2(string languageCode)
        {
            string fileName = $"text.{languageCode}.json";

            var textFileRelativeFilePath = Path.Combine(CONFIG_FOLDER_PATH, LANGUAGE_RESOURCE_FOLDER_NAME, fileName);

            string text = await ReadTextByRelativePathAsync(textFileRelativeFilePath);

            return text;
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

        private static async Task<string> SerializeXsdToString(XmlSchema xmlSchema)
        {
            string xsd;
            await using (var sw = new Utf8StringWriter())
            await using (var xw = XmlWriter.Create(sw, new XmlWriterSettings { Indent = true, Async = true }))
            {
                xmlSchema.Write(xw);
                xsd = sw.ToString();
            }

            return xsd;
        }

        /// <summary>
        /// Stringwriter that ensures UTF8 is used.
        /// </summary>
        internal class Utf8StringWriter : StringWriter
        {
            /// <inheritdoc/>
            public override Encoding Encoding => Encoding.UTF8;
        }
    }
}
