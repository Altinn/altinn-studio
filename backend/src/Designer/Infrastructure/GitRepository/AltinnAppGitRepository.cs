using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Models;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.TypedHttpClients.Exceptions;
using LibGit2Sharp;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;
using JsonSerializer = System.Text.Json.JsonSerializer;
using LayoutSets = Altinn.Studio.Designer.Models.LayoutSets;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository
{
    /// <summary>
    /// Class representing an application specific git repository.
    /// </summary>
    /// <remarks>This class knows that the repository is an Altinn application and hence knows
    /// about folders and file names and can map them to their respective models.
    /// It should however, not have any business logic.</remarks>
    public class AltinnAppGitRepository : AltinnGitRepository
    {
        private const string MODEL_FOLDER_PATH = "App/models/";
        private const string CONFIG_FOLDER_PATH = "App/config/";
        private const string OPTIONS_FOLDER_PATH = "App/options/";
        private const string LAYOUTS_FOLDER_NAME = "App/ui/";
        private const string IMAGES_FOLDER_NAME = "App/wwwroot/";
        private const string LAYOUTS_IN_SET_FOLDER_NAME = "layouts/";
        private const string LANGUAGE_RESOURCE_FOLDER_NAME = "texts/";
        private const string MARKDOWN_TEXTS_FOLDER_NAME = "md/";
        private const string PROCESS_DEFINITION_FOLDER_PATH = "App/config/process/";

        private const string SERVICE_CONFIG_FILENAME = "config.json";
        private const string LAYOUT_SETTINGS_FILENAME = "Settings.json";
        private const string APP_METADATA_FILENAME = "applicationmetadata.json";
        private const string LAYOUT_SETS_FILENAME = "layout-sets.json";
        private const string RULE_HANDLER_FILENAME = "RuleHandler.js";
        private const string RULE_CONFIGURATION_FILENAME = "RuleConfiguration.json";
        private const string PROCESS_DEFINITION_FILENAME = "process.bpmn";

        private static string ProcessDefinitionFilePath => Path.Combine(PROCESS_DEFINITION_FOLDER_PATH, PROCESS_DEFINITION_FILENAME);

        private const string _layoutSettingsSchemaUrl = "https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json";

        private const string TextResourceFileNamePattern = "resource.??.json";

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

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
        public async Task<ApplicationMetadata> GetApplicationMetadata(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string appMetadataRelativeFilePath = Path.Combine(CONFIG_FOLDER_PATH, APP_METADATA_FILENAME);
            string fileContent = await ReadTextByRelativePathAsync(appMetadataRelativeFilePath, cancellationToken);
            ApplicationMetadata applicationMetaData = JsonSerializer.Deserialize<ApplicationMetadata>(fileContent, _jsonOptions);

            return applicationMetaData;
        }

        public bool ApplicationMetadataExists()
        {
            string appMetadataRelativeFilePath = Path.Combine(CONFIG_FOLDER_PATH, APP_METADATA_FILENAME);
            return FileExistsByRelativePath(appMetadataRelativeFilePath);
        }

        /// <summary>
        /// Saves the application metadata file to disk.
        /// </summary>
        /// <param name="applicationMetadata">The updated application metadata to persist.</param>
        public async Task SaveApplicationMetadata(ApplicationMetadata applicationMetadata)
        {
            string metadataAsJson = JsonSerializer.Serialize(applicationMetadata, _jsonOptions);
            string appMetadataRelativeFilePath = Path.Combine(CONFIG_FOLDER_PATH, APP_METADATA_FILENAME);
            await WriteTextByRelativePathAsync(appMetadataRelativeFilePath, metadataAsJson, true);
        }

        /// <summary>
        /// Saves config.json file to disk.
        /// </summary>
        /// <param name="serviceConfiguration">The updated config to persist.</param>
        public async Task SaveAppMetadataConfig(ServiceConfiguration serviceConfiguration)
        {
            string config = JsonSerializer.Serialize(serviceConfiguration, _jsonOptions);
            string configRelativeFilePath = Path.Combine(SERVICE_CONFIG_FILENAME);
            await WriteTextByRelativePathAsync(configRelativeFilePath, config, true);
        }

        /// <summary>
        /// Saves config.json file to disk.
        /// </summary>
        public async Task<ServiceConfiguration> GetAppMetadataConfig()
        {
            string serviceConfigFilePath = Path.Combine(SERVICE_CONFIG_FILENAME);
            if (!FileExistsByRelativePath(serviceConfigFilePath))
            {
                throw new FileNotFoundException("Config file not found.");
            }
            string fileContent = await ReadTextByRelativePathAsync(serviceConfigFilePath);
            ServiceConfiguration config = JsonSerializer.Deserialize<ServiceConfiguration>(fileContent, _jsonOptions);
            return config;
        }

        /// <summary>
        /// Get the Json Schema file representing the application model to disk.
        /// </summary>
        /// <param name="modelName">The name of the model without extensions. This will be used as filename.</param>
        /// <returns>A string containing content of the json schema.</returns>
        [Obsolete("Generic method GetJsonSchema is deprecated. Use a dedicated one instead.")]
        public async Task<string> GetJsonSchema(string modelName)
        {
            string relativeFilePath = GetRelativeModelFilePath(modelName);
            string jsonSchemaContent = await ReadTextByRelativePathAsync(relativeFilePath);

            return jsonSchemaContent;
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
        public override async Task<string> SaveJsonSchema(string jsonSchema, string modelName)
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
        /// <returns>A string containing the relative path to the file saved.</returns>
        public override async Task<string> SaveXsd(string xsd, string fileName)
        {
            string filePath = Path.Combine(MODEL_FOLDER_PATH, fileName);
            await WriteTextByRelativePathAsync(filePath, xsd, true);

            return filePath;
        }

        /// <summary>
        /// Gets the folder where the data models are stored.
        /// </summary>
        /// <returns>A string with the relative path to the model folder within the app.</returns>
        public string GetRelativeModelFolder()
        {
            return MODEL_FOLDER_PATH;
        }

        public List<string> GetLanguages()
        {
            List<string> languages = new();
            string pathToTexts = GetPathToTexts();
            if (!Directory.Exists(pathToTexts))
            {
                Directory.CreateDirectory(pathToTexts);
            }

            string[] directoryFiles = GetFilesByRelativeDirectory(pathToTexts, TextResourceFileNamePattern);
            foreach (string directoryFile in directoryFiles)
            {
                string fileName = Path.GetFileName(directoryFile);
                string[] nameParts = fileName.Split('.');
                string languageCode = nameParts[1];
                languages.Add(languageCode);
                languages.Sort(StringComparer.Ordinal);
            }

            return languages;
        }

        /// <summary>
        /// Returns a specific text resource written in the old text format
        /// based on language code from the application.
        /// </summary>
        /// <remarks>
        /// Format of the dictionary is: &lt;textResourceElementId &lt;language, textResourceElement&gt;&gt;
        /// </remarks>
        public async Task<TextResource> GetTextV1(string language, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string resourcePath = GetPathToJsonTextsFile($"resource.{language}.json");
            if (!FileExistsByRelativePath(resourcePath))
            {
                throw new NotFoundException("Text resource file not found.");
            }
            string fileContent = await ReadTextByRelativePathAsync(resourcePath, cancellationToken);
            TextResource textResource = JsonSerializer.Deserialize<TextResource>(fileContent, _jsonOptions);

            return textResource;
        }

        public async Task SaveTextV1(string languageCode, TextResource jsonTexts)
        {
            string fileName = $"resource.{languageCode}.json";
            string textsFileRelativeFilePath = GetPathToJsonTextsFile(fileName);
            string texts = JsonSerializer.Serialize(jsonTexts, _jsonOptions);
            await WriteTextByRelativePathAsync(textsFileRelativeFilePath, texts);
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
            string textsFileRelativeFilePath = GetPathToJsonTextsFile(fileName);
            string texts = await ReadTextByRelativePathAsync(textsFileRelativeFilePath);
            Dictionary<string, string> jsonTexts = JsonSerializer.Deserialize<Dictionary<string, string>>(texts, _jsonOptions);

            return jsonTexts;
        }

        /// <summary>
        /// Overwrite a V2 texts file with an updated V2 texts file
        /// </summary>
        /// <param name="languageCode">Language identifier</param>
        /// <param name="jsonTexts">Text file for language as string</param>
        public async Task SaveTextsV2(string languageCode, Dictionary<string, string> jsonTexts)
        {
            string fileName = $"{languageCode}.texts.json";
            string textsFileRelativeFilePath = GetPathToJsonTextsFile(fileName);
            string texts = JsonSerializer.Serialize(jsonTexts, _jsonOptions);
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
            string textsFileRelativeFilePath = GetPathToMarkdownTextFile(fileName);
            await WriteTextByRelativePathAsync(textsFileRelativeFilePath, text.Value, true);
        }

        /// <summary>
        /// Get the markdown text specific for a key identified in the filename.
        /// </summary>
        /// <param name="markdownFileName">Filename for file with markdown text for a key</param>
        /// <returns>Markdown text as a string</returns>
        public async Task<string> GetTextMarkdown(string markdownFileName)
        {
            string textsFileRelativeFilePath = GetPathToMarkdownTextFile(markdownFileName);
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
            string textsFileRelativeFilePath = GetPathToJsonTextsFile(textsFileName);
            DeleteFileByRelativePath(textsFileRelativeFilePath);
            IEnumerable<string> fileNames = FindFiles(new[] { $"*.{languageCode}.texts.md" });
            foreach (string fileNamePath in fileNames)
            {
                string fileName = Path.GetFileName(fileNamePath);
                textsFileRelativeFilePath = GetPathToMarkdownTextFile(fileName);
                DeleteFileByRelativePath(textsFileRelativeFilePath);
            }
        }

        /// <summary>
        /// Returns all the layouts for a specific layoutset
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A list of all layouts for a layoutset</returns>
        public async Task<Dictionary<string, JsonNode>> GetFormLayouts(string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Dictionary<string, JsonNode> formLayouts = new();
            string[] layoutNames = GetLayoutNames(layoutSetName);
            foreach (string layoutName in layoutNames)
            {
                JsonNode layout = await GetLayout(layoutSetName, layoutName, cancellationToken);
                formLayouts[layoutName.Replace(".json", "")] = layout;
            }

            return formLayouts;
        }

        /// <summary>
        /// Returns the layout for a specific layoutset
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <param name="layoutName">The name of layoutfile</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The layout</returns>
        public async Task<JsonNode> GetLayout(string layoutSetName, string layoutName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string layoutFilePath = GetPathToLayoutFile(layoutSetName, layoutName);
            string fileContent = await ReadTextByRelativePathAsync(layoutFilePath, cancellationToken);
            return JsonNode.Parse(fileContent);
        }

        /// <summary>
        /// Returns the layout for a specific layoutset
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <param name="layoutName">The name of layoutfile</param>
        /// <returns>The layout</returns>
        public void DeleteLayout(string layoutSetName, string layoutName)
        {
            string layoutFilePath = GetPathToLayoutFile(layoutSetName, layoutName);
            if (!FileExistsByRelativePath(layoutFilePath))
            {
                throw new FileNotFoundException("Layout was not found or has already been deleted");
            }
            DeleteFileByRelativePath(layoutFilePath);
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
        /// Configure the initial layout set by moving layoutsfolder to new dest: App/ui/{layoutSetName}/layouts
        /// </summary>
        public void MoveLayoutsToInitialLayoutSet(string layoutSetName)
        {
            string destRelativePath = GetPathToLayoutSet(layoutSetName);
            if (DirectoryExistsByRelativePath(destRelativePath))
            {
                throw new BadHttpRequestException("Layout sets are already configured");
            }
            string destAbsolutePath = GetAbsoluteFileOrDirectoryPathSanitized(destRelativePath);

            string sourceRelativePath = GetPathToLayoutSet(null);
            if (!DirectoryExistsByRelativePath(sourceRelativePath))
            {
                throw new NotFoundException("Layouts folder doesn't exist");
            }

            string sourceAbsolutePath = GetAbsoluteFileOrDirectoryPathSanitized(sourceRelativePath);
            string layoutSetToCreatePath = destAbsolutePath.Remove(destAbsolutePath.IndexOf(LAYOUTS_IN_SET_FOLDER_NAME, StringComparison.Ordinal));
            Directory.CreateDirectory(layoutSetToCreatePath);
            Directory.Move(sourceAbsolutePath, destAbsolutePath);
        }

        public void MoveOtherUiFilesToLayoutSet(string layoutSetName)
        {
            string sourceLayoutSettingsPath = GetPathToLayoutSettings(null);
            string destLayoutSettingsPath = GetPathToLayoutSettings(layoutSetName);
            MoveFileByRelativePath(sourceLayoutSettingsPath, destLayoutSettingsPath, LAYOUT_SETTINGS_FILENAME);
            string sourceRuleHandlerPath = GetPathToRuleHandler(null);
            string destRuleHandlerPath = GetPathToRuleHandler(layoutSetName);
            MoveFileByRelativePath(sourceRuleHandlerPath, destRuleHandlerPath, RULE_HANDLER_FILENAME);
            string sourceRuleConfigPath = GetPathToRuleConfiguration(null);
            string destRuleConfigPath = GetPathToRuleConfiguration(layoutSetName);
            MoveFileByRelativePath(sourceRuleConfigPath, destRuleConfigPath, RULE_CONFIGURATION_FILENAME);
        }

        /// <summary>
        /// Check if app uses layoutsets or not based on whether
        /// the list of layoutset names actually are layoutset names
        /// or only the default folder for layouts
        /// </summary>
        /// <returns>A boolean representing if the app uses layoutsets or not</returns>
        public bool AppUsesLayoutSets()
        {
            string layoutSetJsonFilePath = Path.Combine(LAYOUTS_FOLDER_NAME, "layout-sets.json");

            return FileExistsByRelativePath(layoutSetJsonFilePath);
        }

        /// <summary>
        /// Gets all layout names for a specific layoutset
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <returns>An array with the name of all layout files under the specific layoutset</returns>
        public string[] GetLayoutNames(string layoutSetName)
        {
            string layoutSetPath = GetPathToLayoutSet(layoutSetName);
            if (!DirectoryExistsByRelativePath(layoutSetPath) && AppUsesLayoutSets())
            {
                throw new FileNotFoundException();
            }
            List<string> layoutNames = new();
            if (DirectoryExistsByRelativePath(layoutSetPath))
            {
                foreach (string layoutPath in GetFilesByRelativeDirectory(layoutSetPath))
                {
                    layoutNames.Add(Path.GetFileName(layoutPath));
                }
            }

            return layoutNames.ToArray();
        }

        /// <summary>
        /// Gets the Settings.json for a specific layoutset
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The content of Settings.json</returns>
        public async Task<JsonNode> GetLayoutSettingsAndCreateNewIfNotFound(string layoutSetName, CancellationToken cancellationToken = default)
        {
            string layoutSettingsPath = GetPathToLayoutSettings(layoutSetName);
            cancellationToken.ThrowIfCancellationRequested();
            if (!FileExistsByRelativePath(layoutSettingsPath))
            {
                await CreateLayoutSettings(layoutSetName);
            }
            string fileContent = await ReadTextByRelativePathAsync(layoutSettingsPath);
            var layoutSettings = JsonNode.Parse(fileContent);

            return layoutSettings;
        }

        private async Task CreateLayoutSettings(string layoutSetName)
        {
            string layoutSetPath = GetPathToLayoutSet(layoutSetName);
            if (!DirectoryExistsByRelativePath(layoutSetPath))
            {
                Directory.CreateDirectory(layoutSetPath);
            }
            string[] layoutNames = MakePageOrder(GetLayoutNames(layoutSetName));

            string defaultSettings = $@"{{
            ""schema"": ""{_layoutSettingsSchemaUrl}"",
            ""pages"": {{
                ""order"": {JsonSerializer.Serialize(layoutNames)}
                }}
            }}";

            var layoutSettings = JsonNode.Parse(defaultSettings);
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
        /// <param name="layoutSettings">The layoutsettings to be saved</param>
        /// <returns>The content of Settings.json</returns>
        public async Task SaveLayoutSettings(string layoutSetName, JsonNode layoutSettings)
        {
            string layoutSettingsPath = GetPathToLayoutSettings(layoutSetName);
            string serializedLayoutSettings = layoutSettings.ToJsonString(_jsonOptions);
            await WriteTextByRelativePathAsync(layoutSettingsPath, serializedLayoutSettings);
        }

        /// <summary>
        /// Saves layout file to specific layoutset. If layoutset is null
        /// it will be stored as if the app does not use layoutsets, meaning under /App/ui/layouts/.
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <param name="layoutFileName">The name of layout file</param>
        /// <param name="layout">The actual layout that is saved</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public async Task SaveLayout(string layoutSetName, string layoutFileName, JsonNode layout, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string layoutFilePath = GetPathToLayoutFile(layoutSetName, layoutFileName);
            string serializedLayout = layout.ToJsonString(_jsonOptions);
            await WriteTextByRelativePathAsync(layoutFilePath, serializedLayout, true, cancellationToken);
        }

        public void UpdateFormLayoutName(string layoutSetName, string layoutFileName, string newFileName)
        {
            string currentFilePath = GetPathToLayoutFile(layoutSetName, layoutFileName);
            string newFilePath = GetPathToLayoutFile(layoutSetName, newFileName);
            if (!FileExistsByRelativePath(currentFilePath))
            {
                throw new FileNotFoundException("Layout does not exist.");
            }
            if (FileExistsByRelativePath(newFilePath))
            {
                throw new ArgumentException("New layout name must be unique.");
            }
            File.Move(GetAbsoluteFileOrDirectoryPathSanitized(currentFilePath), GetAbsoluteFileOrDirectoryPathSanitized(newFilePath));
        }

        public async Task<LayoutSets> GetLayoutSetsFile(CancellationToken cancellationToken = default)
        {
            if (AppUsesLayoutSets())
            {
                string layoutSetsFilePath = GetPathToLayoutSetsFile();
                cancellationToken.ThrowIfCancellationRequested();
                string fileContent = await ReadTextByRelativePathAsync(layoutSetsFilePath);
                LayoutSets layoutSetsFile = JsonSerializer.Deserialize<LayoutSets>(fileContent, _jsonOptions);
                return layoutSetsFile;
            }

            throw new NotFoundException("No layout set was found for this app");
        }

        public async Task SaveLayoutSetsFile(LayoutSets layoutSets)
        {
            if (AppUsesLayoutSets())
            {
                string layoutSetsFilePath = GetPathToLayoutSetsFile();
                string layoutSetsString = JsonSerializer.Serialize(layoutSets, _jsonOptions);
                await WriteTextByRelativePathAsync(layoutSetsFilePath, layoutSetsString);
            }

            throw new NotFoundException("No layout set was found for this app");
        }

        /// <summary>
        /// Saves the RuleHandler.js for a specific layoutset
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <param name="ruleHandler">The layoutsettings to be saved</param>
        /// <returns>The content of Settings.json</returns>
        public async Task SaveRuleHandler(string layoutSetName, string ruleHandler)
        {
            string ruleHandlerPath = GetPathToRuleHandler(layoutSetName);
            await WriteTextByRelativePathAsync(ruleHandlerPath, ruleHandler);
        }

        /// <summary>
        /// Gets the RuleHandler.js for a specific layoutset
        /// </summary>
        /// <param name="layoutSetName">The name of the layoutset where the layout belong</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The content of Settings.json</returns>
        public async Task<string> GetRuleHandler(string layoutSetName, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string ruleHandlerPath = GetPathToRuleHandler(layoutSetName);
            if (FileExistsByRelativePath(ruleHandlerPath))
            {
                string ruleHandler = await ReadTextByRelativePathAsync(ruleHandlerPath, cancellationToken);
                return ruleHandler;
            }

            throw new FileNotFoundException("Rule handler not found.");
        }

        /// <summary>
        /// Saves the RuleConfiguration.json for a specific layout set
        /// </summary>
        /// <param name="layoutSetName">The name of the layout set where the layout belong</param>
        /// <param name="ruleConfiguration">The ruleConfiguration to be saved</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public async Task SaveRuleConfiguration(string layoutSetName, JsonNode ruleConfiguration, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string ruleConfigurationPath = GetPathToRuleConfiguration(layoutSetName);
            string serializedRuleConfiguration = ruleConfiguration.ToJsonString(_jsonOptions);
            await WriteTextByRelativePathAsync(ruleConfigurationPath, serializedRuleConfiguration, cancellationToken: cancellationToken);
        }

        /// <summary>
        /// Gets the RuleConfiguration.json for a specific layout set
        /// </summary>
        /// <param name="layoutSetName">The name of the layout set where the layout belong</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The content of RuleConfiguration.json</returns>
        public async Task<string> GetRuleConfigAndAddDataToRootIfNotAlreadyPresent(string layoutSetName, CancellationToken cancellationToken = default)
        {
            string ruleConfigurationPath = GetPathToRuleConfiguration(layoutSetName);
            if (FileExistsByRelativePath(ruleConfigurationPath))
            {
                string ruleConfiguration = await ReadTextByRelativePathAsync(ruleConfigurationPath, cancellationToken);
                string fixedRuleConfig = await AddDataToRootOfRuleConfigIfNotPresent(layoutSetName, ruleConfiguration, cancellationToken);
                return fixedRuleConfig;
            }
            throw new FileNotFoundException("Rule configuration not found.");
        }

        private async Task<string> AddDataToRootOfRuleConfigIfNotPresent(string layoutSetName, string ruleConfigData, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            JsonNode ruleConfig = JsonNode.Parse(ruleConfigData);
            if (ruleConfig?["data"] == null)
            {
                JsonNode fixedRuleConfig = JsonNode.Parse("{\"data\":\"\"}");
                fixedRuleConfig["data"] = ruleConfig;
                await SaveRuleConfiguration(layoutSetName, fixedRuleConfig, cancellationToken);
                return JsonSerializer.Serialize(fixedRuleConfig);
            }
            return ruleConfigData;
        }

        public async Task<LayoutSets> CreateLayoutSetFile(string layoutSetName)
        {
            LayoutSets layoutSets = new()
            {
                Sets = new List<LayoutSetConfig>
                {
                    new()
                    {
                        Id = layoutSetName,
                        DataType = null, // TODO: Add name of datamodel - but what if it does not exist?
                        Tasks = new List<string> { "Task_1" }
                    }
                }
            };
            string layoutSetsString = JsonSerializer.Serialize(layoutSets, _jsonOptions);
            string pathToLayOutSets = Path.Combine(LAYOUTS_FOLDER_NAME, LAYOUT_SETS_FILENAME);
            await WriteTextByRelativePathAsync(pathToLayOutSets, layoutSetsString);
            return layoutSets;
        }

        /// <summary>
        /// Gets the options list with the provided id.
        /// <param name="optionsListId">The id of the options list to fetch.</param>
        /// <returns>The options list as a string.</returns>
        /// </summary>
        public async Task<string> GetOptions(string optionsListId, CancellationToken cancellationToken = default)
        {
            string optionsFilePath = Path.Combine(OPTIONS_FOLDER_PATH, $"{optionsListId}.json");
            if (!FileExistsByRelativePath(optionsFilePath))
            {
                throw new NotFoundException("Options file not found.");
            }
            string fileContent = await ReadTextByRelativePathAsync(optionsFilePath, cancellationToken);

            return fileContent;
        }

        /// <summary>
        /// Gets a list of file names from the Options folder representing the available options lists.
        /// <returns>A list of option list names.</returns>
        /// </summary>
        public string[] GetOptionListIds()
        {
            string optionsFolder = Path.Combine(OPTIONS_FOLDER_PATH);
            if (!DirectoryExistsByRelativePath(optionsFolder))
            {
                throw new NotFoundException("Options folder not found.");
            }
            string[] fileNames = GetFilesByRelativeDirectory(optionsFolder);
            List<string> optionListIds = new();
            foreach (string fileName in fileNames.Select(f => Path.GetFileNameWithoutExtension(f)))
            {
                optionListIds.Add(fileName);
            }

            return optionListIds.ToArray();
        }

        /// <summary>
        /// Saves the processdefinition file on disk.
        /// </summary>
        /// <param name="file">Stream of the file to be saved.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public async Task SaveProcessDefinitionFileAsync(Stream file, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (file.Length > 1000_000)
            {
                throw new ArgumentException("Bpmn file is too large");
            }
            await Guard.AssertValidXmlStreamAndRewindAsync(file);

            await WriteStreamByRelativePathAsync(ProcessDefinitionFilePath, file, true, cancellationToken);
        }

        public Stream GetProcessDefinitionFile()
        {
            if (!FileExistsByRelativePath(ProcessDefinitionFilePath))
            {
                throw new NotFoundHttpRequestException("Bpmn file not found.");
            }

            return OpenStreamByRelativePath(ProcessDefinitionFilePath);
        }

        /// <summary>
        /// Gets specified image from App/wwwroot folder of local repo
        /// </summary>
        /// <param name="imageFilePath">The file path of the image</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The image as stream</returns>
        public Stream GetImage(string imageFilePath, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string imagePath = GetPathToImage(imageFilePath);
            return OpenStreamByRelativePath(imagePath);
        }

        /// <summary>
        /// Gets the relative path to a model.
        /// </summary>
        /// <param name="modelName">The name of the model without extensions.</param>
        /// <returns>A string with the relative path to the model file, including file extension. </returns>
        private string GetRelativeModelFilePath(string modelName)
        {
            return Path.Combine(MODEL_FOLDER_PATH, $"{modelName}.schema.json");
        }

        private static string GetPathToTexts()
        {
            return Path.Combine(CONFIG_FOLDER_PATH, LANGUAGE_RESOURCE_FOLDER_NAME);
        }

        private static string GetPathToImage(string imageFilePath)
        {
            return Path.Combine(IMAGES_FOLDER_NAME, imageFilePath);
        }

        private static string GetPathToJsonTextsFile(string fileName)
        {
            return fileName.IsNullOrEmpty() ?
                Path.Combine(CONFIG_FOLDER_PATH, LANGUAGE_RESOURCE_FOLDER_NAME) :
                Path.Combine(CONFIG_FOLDER_PATH, LANGUAGE_RESOURCE_FOLDER_NAME, fileName);
        }

        private static string GetPathToMarkdownTextFile(string fileName)
        {
            return Path.Combine(CONFIG_FOLDER_PATH, LANGUAGE_RESOURCE_FOLDER_NAME, MARKDOWN_TEXTS_FOLDER_NAME, fileName);
        }

        // can be null if app does not use layoutset
        private static string GetPathToLayoutSet(string layoutSetName)
        {
            return layoutSetName.IsNullOrEmpty() ?
                Path.Combine(LAYOUTS_FOLDER_NAME, LAYOUTS_IN_SET_FOLDER_NAME) :
                Path.Combine(LAYOUTS_FOLDER_NAME, layoutSetName, LAYOUTS_IN_SET_FOLDER_NAME);
        }

        // can be null if app does not use layoutset
        private static string GetPathToLayoutFile(string layoutSetName, string fileName)
        {
            return layoutSetName.IsNullOrEmpty() ?
                Path.Combine(LAYOUTS_FOLDER_NAME, LAYOUTS_IN_SET_FOLDER_NAME, fileName) :
                Path.Combine(LAYOUTS_FOLDER_NAME, layoutSetName, LAYOUTS_IN_SET_FOLDER_NAME, fileName);
        }

        // can be null if app does not use layoutset
        private static string GetPathToLayoutSettings(string layoutSetName)
        {
            return layoutSetName.IsNullOrEmpty() ?
                Path.Combine(LAYOUTS_FOLDER_NAME, LAYOUT_SETTINGS_FILENAME) :
                Path.Combine(LAYOUTS_FOLDER_NAME, layoutSetName, LAYOUT_SETTINGS_FILENAME);
        }

        private static string GetPathToLayoutSetsFile()
        {
            return Path.Combine(LAYOUTS_FOLDER_NAME, LAYOUT_SETS_FILENAME);
        }

        private static string GetPathToRuleHandler(string layoutSetName)
        {
            return layoutSetName.IsNullOrEmpty() ?
                Path.Combine(LAYOUTS_FOLDER_NAME, RULE_HANDLER_FILENAME) :
                Path.Combine(LAYOUTS_FOLDER_NAME, layoutSetName, RULE_HANDLER_FILENAME);
        }

        private static string GetPathToRuleConfiguration(string layoutSetName)
        {
            return layoutSetName.IsNullOrEmpty() ?
                Path.Combine(LAYOUTS_FOLDER_NAME, RULE_CONFIGURATION_FILENAME) :
                Path.Combine(LAYOUTS_FOLDER_NAME, layoutSetName, RULE_CONFIGURATION_FILENAME);
        }



        /// <summary>
        /// String writer that ensures UTF8 is used.
        /// </summary>
        internal class Utf8StringWriter : StringWriter
        {
            /// <inheritdoc/>
            public override Encoding Encoding => Encoding.UTF8;
        }
    }
}
