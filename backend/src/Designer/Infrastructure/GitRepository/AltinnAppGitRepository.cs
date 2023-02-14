using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Models;
using JetBrains.Annotations;
using k8s.Autorest;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using NuGet.Protocol;
using Formatting = Newtonsoft.Json.Formatting;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository
{
    /// <summary>
    /// Class representing an application specific git repository.
    /// </summary>
    /// <remarks>This class knows that the repository is an Altinn application and hence knows
    /// about folders and file names and can map them to their respective models.
    /// It should however, not have any business logic. The <see cref="GetTextResourcesForAllLanguages"/> method is borderline
    /// as it merges multiple on-disk models into another structure.</remarks>
    public class AltinnAppGitRepository : AltinnGitRepository
    {
        private const string MODEL_FOLDER_PATH = "App/models/";
        private const string CONFIG_FOLDER_PATH = "App/config/";
        private const string LAYOUTS_FOLDER_NAME = "App/ui/";
        private const string LAYOUTS_IN_SET_FOLDER_NAME = "layouts/";
        private const string LANGUAGE_RESOURCE_FOLDER_NAME = "texts/";
        private const string MARKDOWN_TEXTS_FOLDER_NAME = "md/";

        private const string LAYOUT_SETTINGS_FILENAME = "Settings.json";
        private const string APP_METADATA_FILENAME = "applicationmetadata.json";

        private readonly string _layoutSettingsSchemaUrl = "https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json";

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
        public async Task SaveModelMetadata(string modelMetadata, string modelName)
        {
            string modelMetadataRelativeFilePath = Path.Combine(MODEL_FOLDER_PATH, $"{modelName}.metadata.json");

            await WriteTextByRelativePathAsync(modelMetadataRelativeFilePath, modelMetadata, true);
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
        public async override Task<string> SaveJsonSchema(string jsonSchema, string modelName)
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
        /// <returns>A string containing the relative path to the file saved.</returns>
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
        public async override Task<string> SaveXsd(string xsd, string fileName)
        {
            string filePath = Path.Combine(GetRelativeModelFolder(), fileName);
            await WriteTextByRelativePathAsync(filePath, xsd, true);

            return filePath;
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
            string resourcePath = GetPathToJsonTextsFile($"resource.{language}.json");

            var fileContent = await ReadTextByRelativePathAsync(resourcePath);
            var textResource = JsonConvert.DeserializeObject<Designer.Models.TextResource>(fileContent);

            return textResource;
        }

        /// <summary>
        /// Overwrite a V2 texts file with an updated V2 texts file
        /// </summary>
        /// <param name="languageCode">Language identifier</param>
        /// <param name="jsonTexts">Text file for language as string</param>
        public async Task SaveTextsV2(string languageCode, Dictionary<string, string> jsonTexts)
        {
            string fileName = $"{languageCode}.texts.json";
            var textsFileRelativeFilePath = GetPathToJsonTextsFile(fileName);

            var jsonOptions = new JsonSerializerOptions() { WriteIndented = true, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
            string texts = System.Text.Json.JsonSerializer.Serialize(jsonTexts, jsonOptions);

            await WriteTextByRelativePathAsync(textsFileRelativeFilePath, texts);
        }

        /// <summary>
        /// Overwrite or creates a markdown file for a specific text for a specific language.
        /// </summary>
        /// <param name="languageCode">Language identifier</param>
        /// <param name="text">Keyvaluepair containing markdown text</param>
        public async Task SaveTextMarkdown(string languageCode, KeyValuePair<string, string> text)
        {
            string fileName = $"{text.Key}.{languageCode}.texts.md";

            var textsFileRelativeFilePath = GetPathToMarkdownTextFile(fileName);

            await WriteTextByRelativePathAsync(textsFileRelativeFilePath, text.Value, true);
        }

        /// <summary>
        /// Gets a merged set of all text resources in the application.
        /// </summary>
        /// Format of the dictionary is: &lt;textResourceElementId &lt;language, textResourceElement&gt;&gt;
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        public async Task<Dictionary<string, Dictionary<string, Designer.Models.TextResourceElement>>> GetTextResourcesForAllLanguages()
        {
            var allResourceTexts = new Dictionary<string, Dictionary<string, Designer.Models.TextResourceElement>>();

            string textResourcesDirectory = GetPathToJsonTextsFile(null);

            if (!DirectoryExistsByRelativePath(textResourcesDirectory))
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
        /// <returns>Texts as a string</returns>
        public async Task<Dictionary<string, string>> GetTextsV2(string languageCode)
        {
            string fileName = $"{languageCode}.texts.json";

            var textsFileRelativeFilePath = GetPathToJsonTextsFile(fileName);

            string texts = await ReadTextByRelativePathAsync(textsFileRelativeFilePath);

            Dictionary<string, string> jsonTexts = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(texts);

            return jsonTexts;
        }

        /// <summary>
        /// Get the markdown text specific for a key identified in the filename.
        /// </summary>
        /// <param name="markdownFileName">Filename for file with markdown text for a key</param>
        /// <returns>Markdown text as a string</returns>
        public async Task<string> GetTextMarkdown(string markdownFileName)
        {
            var textsFileRelativeFilePath = GetPathToMarkdownTextFile(markdownFileName);

            string text = await ReadTextByRelativePathAsync(textsFileRelativeFilePath);

            return text;
        }

        /// <summary>
        /// Deletes the texts file for a specific languageCode.
        /// </summary>
        /// <param name="languageCode">Language identifier</param>
        public void DeleteTexts(string languageCode)
        {
            string textsFileName = $"{languageCode}.texts.json";
            var textsFileRelativeFilePath = GetPathToJsonTextsFile(textsFileName);
            DeleteFileByRelativePath(textsFileRelativeFilePath);

            var fileNames = FindFiles(new[] { $"*.{languageCode}.texts.md" });
            foreach (string fileNamePath in fileNames)
            {
                string fileName = Path.GetFileName(fileNamePath);
                textsFileRelativeFilePath = GetPathToMarkdownTextFile(fileName);
                DeleteFileByRelativePath(textsFileRelativeFilePath);
            }
        }

        /// <summary>
        /// Returns the
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <param name="layoutName">The name of layoutfile</param>
        /// <returns>The layout</returns>
        public async Task<FormLayout> GetLayout(string layoutSetName, string layoutName)
        {
            string layoutFilePath = GetPathToLayoutFile(layoutSetName, layoutName);

            string fileContent = await ReadTextByRelativePathAsync(layoutFilePath);
            FormLayout layout = System.Text.Json.JsonSerializer.Deserialize<FormLayout>(fileContent);

            return layout;
        }

        /// <summary>
        /// Gets a list of all layoutset names
        /// <remarks>If app does not use layoutset the default folder for layouts "layouts" will be returned</remarks>
        /// </summary>
        /// <returns>An array of all layoutset names</returns>
        public string[] GetLayoutSetNames()
        {
            string layoutSetsRelativePath = Path.Combine(LAYOUTS_FOLDER_NAME);
            string[] layoutSetNames = GetDirectoriesByRelativeDirectory(layoutSetsRelativePath);
            return layoutSetNames;
        }

        /// <summary>
        /// Check if app uses layoutsets or not based on whether
        /// the list of layoutset names actually are layoutset names
        /// or only the default folder for layouts
        /// </summary>
        /// <returns>A boolean representing if the app uses layoutsets or not</returns>
        public bool AppUsesLayoutSets()
        {
            string[] layoutSetNames = GetLayoutSetNames();
            string layoutSetRelativePath = GetPathToLayoutSet(layoutSetNames[0]);
            return !(layoutSetNames.Contains("layouts") && layoutSetNames.Length == 1 && !DirectoryExistsByRelativePath(layoutSetRelativePath));
        }

        /// <summary>
        /// Gets all layout names for a specific layoutset
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <returns>An array with the name of all layout files under the specific layoutset</returns>
        public string[] GetLayoutNames([CanBeNull] string layoutSetName)
        {
            string layoutSetPath = GetPathToLayoutSet(layoutSetName);
            List<string> layoutNames = new();
            foreach (string layoutPath in GetFilesByRelativeDirectory(layoutSetPath))
            {
                layoutNames.Add(Path.GetFileName(layoutPath));
            }
            return layoutNames.ToArray();
        }

        /// <summary>
        /// Gets the Settings.json for a specific layoutset
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <returns>The content of Settings.json</returns>
        public async Task<LayoutSettings> GetLayoutSettings(string layoutSetName)
        {
            string layoutSettingsPath = GetPathToLayoutSettings(layoutSetName);
            if (!FileExistsByRelativePath(layoutSettingsPath))
            {
                await CreateLayoutSettings(layoutSetName);
            }

            string fileContent = await ReadTextByRelativePathAsync(layoutSettingsPath);
            LayoutSettings layoutSettings = System.Text.Json.JsonSerializer.Deserialize<LayoutSettings>(fileContent);
            return layoutSettings;
        }

        public async Task CreateLayoutSettings(string layoutSetName)
        {
            string[] layoutNames = MakePageOrder(GetLayoutNames(layoutSetName));
            LayoutSettings layoutSettings = new()
            {
                schema = _layoutSettingsSchemaUrl,
                pages = new Pages() { order = layoutNames }
            };
            await SaveLayoutSettings(layoutSetName, layoutSettings);
        }

        private static string[] MakePageOrder(string[] layoutNames)
        {
            List<string> layoutNamesWithoutFileEndings = new();
            foreach (string layoutName in layoutNames)
            {
                layoutNamesWithoutFileEndings.Add(layoutName.Replace(".json", ""));
            }

            return layoutNamesWithoutFileEndings.ToArray();
        }

        /// <summary>
        /// Saves the Settings.json for a specific layoutset
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <returns>The content of Settings.json</returns>
        public async Task SaveLayoutSettings(string layoutSetName, LayoutSettings layoutSettings)
        {
            string layoutSettingsPath = GetPathToLayoutSettings(layoutSetName);
            JsonSerializerOptions jsonOptions = new()
            {
                WriteIndented = true,
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };
            string serializedLayoutSettings = System.Text.Json.JsonSerializer.Serialize(layoutSettings, jsonOptions);

            await WriteTextByRelativePathAsync(layoutSettingsPath, serializedLayoutSettings);
        }

        /// <summary>
        /// Saves layout file to specific layoutset. If layoutset is null
        /// it will be stored as if the app does not use layoutsets, meaning under /App/ui/layouts/.
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <param name="layoutName">The name of layout file</param>
        /// <param name="layout">The actual layout that is saved</param>
        public async Task SaveLayout([CanBeNull] string layoutSetName, string layoutName, Designer.Models.FormLayout layout)
        {
            string layoutFilePath = GetPathToLayoutFile(layoutSetName, layoutName);
            JsonSerializerOptions jsonOptions = new()
            {
                WriteIndented = true,
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };
            string serializedLayout = System.Text.Json.JsonSerializer.Serialize(layout, jsonOptions);

            await WriteTextByRelativePathAsync(layoutFilePath, serializedLayout);
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

            string textResourcesDirectory = GetPathToJsonTextsFile(null);

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

        private static string GetPathToJsonTextsFile([CanBeNull] string fileName)
        {
            string textsFileRelativeFilePath = fileName.IsNullOrEmpty() ? Path.Combine(CONFIG_FOLDER_PATH, LANGUAGE_RESOURCE_FOLDER_NAME) : Path.Combine(CONFIG_FOLDER_PATH, LANGUAGE_RESOURCE_FOLDER_NAME, fileName);
            return textsFileRelativeFilePath;
        }

        private static string GetPathToMarkdownTextFile(string fileName)
        {
            string mdTextsFileRelativeFilePath = Path.Combine(CONFIG_FOLDER_PATH, LANGUAGE_RESOURCE_FOLDER_NAME, MARKDOWN_TEXTS_FOLDER_NAME, fileName);
            return mdTextsFileRelativeFilePath;
        }

        // can be null if app does not use layoutset
        private static string GetPathToLayoutSet([CanBeNull] string layoutSetName)
        {
            if (layoutSetName.IsNullOrEmpty())
            {
                return Path.Combine(LAYOUTS_FOLDER_NAME, LAYOUTS_IN_SET_FOLDER_NAME);
            }

            return Path.Combine(LAYOUTS_FOLDER_NAME, layoutSetName, LAYOUTS_IN_SET_FOLDER_NAME);
        }

        // can be null if app does not use layoutset
        private static string GetPathToLayoutFile([CanBeNull] string layoutSetName, string fileName)
        {
            if (layoutSetName.IsNullOrEmpty())
            {
                return Path.Combine(LAYOUTS_FOLDER_NAME, LAYOUTS_IN_SET_FOLDER_NAME, fileName);
            }
            return Path.Combine(LAYOUTS_FOLDER_NAME, layoutSetName, LAYOUTS_IN_SET_FOLDER_NAME, fileName);
        }

        // can be null if app does not use layoutset
        private static string GetPathToLayoutSettings([CanBeNull] string layoutSetName)
        {
            if (layoutSetName.IsNullOrEmpty())
            {
                return Path.Combine(LAYOUTS_FOLDER_NAME, LAYOUT_SETTINGS_FILENAME);
            }
            return Path.Combine(LAYOUTS_FOLDER_NAME, layoutSetName, LAYOUT_SETTINGS_FILENAME);
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
