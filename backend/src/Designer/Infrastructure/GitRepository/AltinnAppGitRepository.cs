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
using System.Xml.Serialization;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.TypedHttpClients.Exceptions;
using LibGit2Sharp;
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
        private const string ModelFolderPath = "App/models/";
        private const string ConfigFolderPath = "App/config/";
        private const string OptionsFolderPath = "App/options/";
        private const string LayoutsFolderName = "App/ui/";
        private const string ImagesFolderName = "App/wwwroot/";
        private const string LayoutsInSetFolderName = "layouts/";
        private const string LanguageResourceFolderName = "texts/";
        private const string MarkdownTextsFolderName = "md/";
        private const string ProcessDefinitionFolderPath = "App/config/process/";
        private const string CshtmlPath = "App/views/Home/Index.cshtml";

        private const string ServiceConfigFilename = "config.json";
        private const string LayoutSettingsFilename = "Settings.json";
        private const string AppMetadataFilename = "applicationmetadata.json";
        private const string LayoutSetsFilename = "layout-sets.json";
        private const string FooterFilename = "footer.json";
        private const string RuleHandlerFilename = "RuleHandler.js";
        private const string RuleConfigurationFilename = "RuleConfiguration.json";
        private const string ProcessDefinitionFilename = "process.bpmn";

        private static string ProcessDefinitionFilePath =>
            Path.Combine(ProcessDefinitionFolderPath, ProcessDefinitionFilename);

        private const string LayoutSettingsSchemaUrl =
            "https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json";
        private const string LayoutSchemaUrl =
            "https://altinncdn.no/schemas/json/layout/layout.schema.v1.json";

        private const string TextResourceFileNamePattern = "resource.??.json";
        private const string SchemaFilePatternJson = "*.schema.json";
        private const string SchemaFilePatternXsd = "*.xsd";

        public static readonly string InitialLayoutFileName = "Side1";

        public readonly JsonNode InitialLayout = new JsonObject
        {
            ["$schema"] = LayoutSchemaUrl,
            ["data"] = new JsonObject { ["layout"] = new JsonArray([]) },
        };

        public readonly JsonNode InitialLayoutSettings = new JsonObject
        {
            ["$schema"] = LayoutSettingsSchemaUrl,
            ["pages"] = new JsonObject { ["order"] = new JsonArray([InitialLayoutFileName]) },
        };

        private static readonly JsonSerializerOptions s_jsonOptions = new()
        {
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="AltinnAppGitRepository"/> class.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="developer">Developer that is working on the repository.</param>
        /// <param name="repositoriesRootDirectory">Base path (full) for where the repository resides on-disk.</param>
        /// <param name="repositoryDirectory">Full path to the root directory of this repository on-disk.</param>
        public AltinnAppGitRepository(
            string org,
            string repository,
            string developer,
            string repositoriesRootDirectory,
            string repositoryDirectory
        )
            : base(org, repository, developer, repositoriesRootDirectory, repositoryDirectory) { }

        /// <summary>
        /// Gets the application metadata.
        /// </summary>
        public async Task<ApplicationMetadata> GetApplicationMetadata(
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            string appMetadataRelativeFilePath = Path.Combine(
                ConfigFolderPath,
                AppMetadataFilename
            );
            string fileContent = await ReadTextByRelativePathAsync(
                appMetadataRelativeFilePath,
                cancellationToken
            );
            ApplicationMetadata applicationMetaData =
                JsonSerializer.Deserialize<ApplicationMetadata>(fileContent, s_jsonOptions);

            return applicationMetaData;
        }

        public bool ApplicationMetadataExists()
        {
            string appMetadataRelativeFilePath = Path.Combine(
                ConfigFolderPath,
                AppMetadataFilename
            );
            return FileExistsByRelativePath(appMetadataRelativeFilePath);
        }

        /// <summary>
        /// Saves the application metadata file to disk.
        /// </summary>
        /// <param name="applicationMetadata">The updated application metadata to persist.</param>
        public async Task SaveApplicationMetadata(ApplicationMetadata applicationMetadata)
        {
            string metadataAsJson = JsonSerializer.Serialize(applicationMetadata, s_jsonOptions);
            string appMetadataRelativeFilePath = Path.Combine(
                ConfigFolderPath,
                AppMetadataFilename
            );
            await WriteTextByRelativePathAsync(appMetadataRelativeFilePath, metadataAsJson, true);
        }

        /// <summary>
        /// Saves config.json file to disk.
        /// </summary>
        /// <param name="serviceConfiguration">The updated config to persist.</param>
        public async Task SaveAppMetadataConfig(ServiceConfiguration serviceConfiguration)
        {
            string config = JsonSerializer.Serialize(serviceConfiguration, s_jsonOptions);
            string configRelativeFilePath = Path.Combine(ServiceConfigFilename);
            await WriteTextByRelativePathAsync(configRelativeFilePath, config, true);
        }

        /// <summary>
        /// Saves config.json file to disk.
        /// </summary>
        public async Task<ServiceConfiguration> GetAppMetadataConfig()
        {
            string serviceConfigFilePath = Path.Combine(ServiceConfigFilename);
            if (!FileExistsByRelativePath(serviceConfigFilePath))
            {
                throw new FileNotFoundException("Config file not found.");
            }
            string fileContent = await ReadTextByRelativePathAsync(serviceConfigFilePath);
            ServiceConfiguration config = JsonSerializer.Deserialize<ServiceConfiguration>(
                fileContent,
                s_jsonOptions
            );
            return config;
        }

        /// <summary>
        /// Deletes model metadata file as it is generated on the fly and does not need to be in the repo.
        /// </summary>
        /// <param name="modelMetadataFilePath">The full relative path to the model metadata</param>
        public void DeleteModelMetadata(string modelMetadataFilePath)
        {
            if (FileExistsByRelativePath(modelMetadataFilePath))
            {
                string absolutePath = GetAbsoluteFileOrDirectoryPathSanitized(
                    modelMetadataFilePath
                );
                File.Delete(absolutePath);
            }
        }

        /// <summary>
        /// Saves the generated C# classes for the application model to disk.
        /// </summary>
        /// <param name="csharpClasses">All C# classes that should be persisted (in one file).</param>
        /// <param name="modelName">The name of the model, will be used as filename.</param>
        public async Task SaveCSharpClasses(string csharpClasses, string modelName)
        {
            string csharpModelRelativeFilePath = Path.Combine(ModelFolderPath, $"{modelName}.cs");
            await WriteTextByRelativePathAsync(csharpModelRelativeFilePath, csharpClasses, true);
        }

        /// <summary>
        /// Saves the Json Schema file representing the application model to disk.
        /// </summary>
        /// <param name="jsonSchema">The Json Schema that should be persisted</param>
        /// <param name="modelName">The name of the model without extensions. This will be used as filename.</param>
        /// <returns>A string containing the relative path to the file saved.</returns>
        public override async Task<string> SaveJsonSchema(string jsonSchema, string modelName)
        {
            string relativeFilePath = GetPathToModelJsonSchema(modelName);
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
            string filePath = Path.Combine(ModelFolderPath, fileName);
            await WriteTextByRelativePathAsync(filePath, xsd, true);

            return filePath;
        }

        /// <summary>
        /// Saves the image to the disk.
        /// </summary>
        /// <param name="image">Stream representing the image to be saved.</param>
        /// <param name="imageFileName">The file name of the image to be saved.</param>
        /// <returns>A string containing the relative path to the file saved.</returns>
        public async Task<string> SaveImageAsMemoryStream(MemoryStream image, string imageFileName)
        {
            string filePath = Path.Combine(ImagesFolderName, imageFileName);
            image.Position = 0;
            await WriteStreamByRelativePathAsync(filePath, image, true);
            image.Position = 0;

            return filePath;
        }

        /// <summary>
        /// Gets the folder where the data models are stored.
        /// </summary>
        /// <returns>A string with the relative path to the model folder within the app.</returns>
        public string GetRelativeModelFolder()
        {
            return ModelFolderPath;
        }

        public List<string> GetLanguages()
        {
            List<string> languages = new();
            string pathToTexts = GetPathToTexts();
            if (!Directory.Exists(pathToTexts))
            {
                Directory.CreateDirectory(pathToTexts);
            }

            string[] directoryFiles = GetFilesByRelativeDirectory(
                pathToTexts,
                TextResourceFileNamePattern
            );
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
        public async Task<TextResource> GetText(
            string language,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            string resourcePath = GetPathToJsonTextsFile($"resource.{language}.json");
            if (!FileExistsByRelativePath(resourcePath))
            {
                throw new NotFoundException("Text resource file not found.");
            }
            string fileContent = await ReadTextByRelativePathAsync(resourcePath, cancellationToken);
            TextResource textResource = JsonSerializer.Deserialize<TextResource>(
                fileContent,
                s_jsonOptions
            );

            return textResource;
        }

        public async Task SaveText(string languageCode, TextResource jsonTexts)
        {
            string fileName = $"resource.{languageCode}.json";
            string textsFileRelativeFilePath = GetPathToJsonTextsFile(fileName);
            string texts = JsonSerializer.Serialize(jsonTexts, s_jsonOptions);
            await WriteTextByRelativePathAsync(textsFileRelativeFilePath, texts);
        }

        public async Task CreatePageLayoutFile(
            string layoutSetId,
            string pageId,
            AltinnPageLayout altinnPageLayout
        )
        {
            await WriteObjectByRelativePathAsync(
                Path.Combine(
                    [LayoutsFolderName, layoutSetId, LayoutsInSetFolderName, $"{pageId}.json"]
                ),
                altinnPageLayout.Structure
            );
        }

        /// <summary>
        /// Returns all the layouts for a specific layout set
        /// </summary>
        /// <param name="layoutSetName">The name of the layout set where the layout belong</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A list of all layouts for a layout set</returns>
        public async Task<Dictionary<string, JsonNode>> GetFormLayouts(
            string layoutSetName,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            Dictionary<string, JsonNode> formLayouts = new();
            string[] layoutNames = GetLayoutNames(layoutSetName);
            foreach (string layoutFileName in layoutNames)
            {
                string layoutName = layoutFileName.Replace(".json", "");
                JsonNode layout = await GetLayout(layoutSetName, layoutName, cancellationToken);
                formLayouts[layoutName] = layout;
            }

            return formLayouts;
        }

        /// <summary>
        /// Returns the layout for a specific layout set
        /// </summary>
        /// <param name="layoutSetName">The name of the layout set where the layout belong</param>
        /// <param name="layoutName">The name of layout file</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The layout</returns>
        public async Task<JsonNode> GetLayout(
            string layoutSetName,
            string layoutName,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            string layoutFilePath = GetPathToLayoutFile(layoutSetName, layoutName);
            string fileContent = await ReadTextByRelativePathAsync(
                layoutFilePath,
                cancellationToken
            );
            return JsonNode.Parse(fileContent);
        }

        /// <summary>
        /// Returns the layout for a specific layout set
        /// </summary>
        /// <param name="layoutSetName">The name of the layout set where the layout belong</param>
        /// <param name="layoutName">The name of layout file</param>
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
        /// Gets a list of all layout set names
        /// <remarks>If app does not use layout set the default folder for layouts "layouts" will be returned</remarks>
        /// </summary>
        /// <returns>An array of all layout set names</returns>
        public string[] GetLayoutSetNames()
        {
            string layoutSetsRelativePath = Path.Combine(LayoutsFolderName);
            string[] layoutSetNames = GetDirectoriesByRelativeDirectory(layoutSetsRelativePath);

            return layoutSetNames;
        }

        /// <summary>
        /// Change name of layout set folder by moving the content to a new folder
        /// </summary>
        public void ChangeLayoutSetFolderName(
            string oldLayoutSetName,
            string newLayoutSetName,
            CancellationToken cancellationToken
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            string currentDirectoryPath = GetPathToLayoutSet(oldLayoutSetName, true);
            string newDirectoryPath = GetPathToLayoutSet(newLayoutSetName, true);
            MoveDirectoryByRelativePath(currentDirectoryPath, newDirectoryPath);
        }

        /// <summary>
        /// Delete layout set folder
        /// </summary>
        public void DeleteLayoutSetFolder(
            string oldLayoutSetName,
            CancellationToken cancellationToken
        )
        {
            cancellationToken.ThrowIfCancellationRequested();

            string relativePath = GetPathToLayoutSet(oldLayoutSetName, true);
            if (DirectoryExistsByRelativePath(relativePath))
            {
                string absolutePath = GetAbsoluteFileOrDirectoryPathSanitized(relativePath);
                Directory.Delete(absolutePath, true);
            }
        }

        /// <summary>
        /// Check if app uses layout sets or not based on whether
        /// the list of layout set names actually are layout set names
        /// or only the default folder for layouts
        /// </summary>
        /// <returns>A boolean representing if the app uses layout sets or not</returns>
        public bool AppUsesLayoutSets()
        {
            string layoutSetJsonFilePath = Path.Combine(LayoutsFolderName, "layout-sets.json");

            return FileExistsByRelativePath(layoutSetJsonFilePath);
        }

        /// <summary>
        /// Gets all layout names for a specific layout set
        /// </summary>
        /// <param name="layoutSetName">The name of the layout set where the layout belong</param>
        /// <returns>An array with the name of all layout files under the specific layout set</returns>
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
                    layoutNames.Add(Path.GetFileNameWithoutExtension(layoutPath));
                }
            }

            return layoutNames.ToArray();
        }

        /// <exception cref="FileNotFoundException">
        /// Thrown if layoutSettings file is not found
        /// </exception>
        public async Task<LayoutSettings> GetLayoutSettings(string layoutSetName)
        {
            string layoutSettingsPath = GetPathToLayoutSettings(layoutSetName);
            if (!FileExistsByRelativePath(layoutSettingsPath))
            {
                throw new FileNotFoundException("Layout settings file not found.");
            }
            string fileContent = await ReadTextByRelativePathAsync(layoutSettingsPath);
            LayoutSettings layoutSettings = JsonSerializer.Deserialize<LayoutSettings>(
                fileContent,
                s_jsonOptions
            );
            return layoutSettings;
        }

        /// <summary>
        /// Gets the Settings.json for a specific layout set
        /// </summary>
        /// <param name="layoutSetName">The name of the layout set where the layout belong</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The content of Settings.json</returns>
        public async Task<JsonNode> GetLayoutSettingsAndCreateNewIfNotFound(
            string layoutSetName,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();

            string layoutSettingsPath = GetPathToLayoutSettings(layoutSetName);
            if (!FileExistsByRelativePath(layoutSettingsPath))
            {
                await CreateLayoutSettings(layoutSetName);
            }
            string fileContent = await ReadTextByRelativePathAsync(
                layoutSettingsPath,
                cancellationToken
            );
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
            JsonNode layoutSettings = InitialLayoutSettings;
            JsonArray layoutNamesArray = new JsonArray();
            foreach (string name in layoutNames)
            {
                layoutNamesArray.Add(name);
            }
            layoutSettings["pages"]["order"] = layoutNamesArray;
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
        /// Saves the Settings.json for a specific layout set
        /// </summary>
        /// <param name="layoutSetName">The name of the layout set where the layout belong</param>
        /// <param name="layoutSettings">The layout settings to be saved</param>
        /// <returns>The content of Settings.json</returns>
        public async Task SaveLayoutSettings(string layoutSetName, JsonNode layoutSettings)
        {
            string layoutSettingsPath = GetPathToLayoutSettings(layoutSetName);
            string serializedLayoutSettings = layoutSettings.ToJsonString(s_jsonOptions);
            await WriteTextByRelativePathAsync(layoutSettingsPath, serializedLayoutSettings);
        }

        public async Task SaveLayoutSettings(string layoutSetName, LayoutSettings layoutSettings)
        {
            string layoutSettingsPath = GetPathToLayoutSettings(layoutSetName);
            string serializedLayoutSettings = JsonSerializer.Serialize<LayoutSettings>(
                layoutSettings,
                s_jsonOptions
            );
            await WriteTextByRelativePathAsync(layoutSettingsPath, serializedLayoutSettings);
        }

        /// <summary>
        /// Saves layout file to specific layout set. If layout set is null
        /// it will be stored as if the app does not use layout sets, meaning under /App/ui/layouts/.
        /// </summary>
        /// <param name="layoutSetName">The name of the layout set where the layout belong</param>
        /// <param name="layoutFileName">The name of layout file</param>
        /// <param name="layout">The actual layout that is saved</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public async Task SaveLayout(
            string layoutSetName,
            string layoutFileName,
            JsonNode layout,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            string layoutFilePath = GetPathToLayoutFile(layoutSetName, layoutFileName);
            string serializedLayout = layout.ToJsonString(s_jsonOptions);
            await WriteTextByRelativePathAsync(
                layoutFilePath,
                serializedLayout,
                true,
                cancellationToken
            );
        }

        public void UpdateFormLayoutName(
            string layoutSetName,
            string layoutName,
            string newLayoutName
        )
        {
            string currentFilePath = GetPathToLayoutFile(layoutSetName, layoutName);
            string newFilePath = GetPathToLayoutFile(layoutSetName, newLayoutName);
            MoveFileByRelativePath(currentFilePath, newFilePath, newLayoutName);
        }

        public async Task<LayoutSets> GetLayoutSetsFile(
            CancellationToken cancellationToken = default
        )
        {
            if (AppUsesLayoutSets())
            {
                string layoutSetsFilePath = GetPathToLayoutSetsFile();
                cancellationToken.ThrowIfCancellationRequested();
                string fileContent = await ReadTextByRelativePathAsync(
                    layoutSetsFilePath,
                    cancellationToken
                );
                LayoutSets layoutSetsFile = JsonSerializer.Deserialize<LayoutSets>(
                    fileContent,
                    s_jsonOptions
                );
                return layoutSetsFile;
            }

            throw new NotFoundException("No layout set was found for this app");
        }

        public async Task SaveLayoutSets(LayoutSets layoutSets)
        {
            if (AppUsesLayoutSets())
            {
                string layoutSetsFilePath = GetPathToLayoutSetsFile();
                string layoutSetsString = JsonSerializer.Serialize(layoutSets, s_jsonOptions);
                await WriteTextByRelativePathAsync(layoutSetsFilePath, layoutSetsString);
            }
            else
            {
                throw new NoLayoutSetsFileFoundException("No layout set was found for this app.");
            }
        }

        public async Task<FooterFile> GetFooter(CancellationToken cancellationToken = default)
        {
            string footerFilePath = GetPathToFooterFile();
            cancellationToken.ThrowIfCancellationRequested();
            string fileContent = await ReadTextByRelativePathAsync(
                footerFilePath,
                cancellationToken
            );
            FooterFile footerFile = JsonSerializer.Deserialize<FooterFile>(
                fileContent,
                s_jsonOptions
            );
            return footerFile;
        }

        /// <summary>
        /// Saves the RuleHandler.js for a specific layout set
        /// </summary>
        /// <param name="layoutSetName">The name of the layout set where the layout belong</param>
        /// <param name="ruleHandler">The layout settings to be saved</param>
        /// <returns>The content of Settings.json</returns>
        public async Task SaveRuleHandler(string layoutSetName, string ruleHandler)
        {
            string ruleHandlerPath = GetPathToRuleHandler(layoutSetName);
            await WriteTextByRelativePathAsync(ruleHandlerPath, ruleHandler);
        }

        /// <summary>
        /// Gets the RuleHandler.js for a specific layout set
        /// </summary>
        /// <param name="layoutSetName">The name of the layout set where the layout belong</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The content of Settings.json</returns>
        public async Task<string> GetRuleHandler(
            string layoutSetName,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            string ruleHandlerPath = GetPathToRuleHandler(layoutSetName);
            if (FileExistsByRelativePath(ruleHandlerPath))
            {
                string ruleHandler = await ReadTextByRelativePathAsync(
                    ruleHandlerPath,
                    cancellationToken
                );
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
        public async Task SaveRuleConfiguration(
            string layoutSetName,
            JsonNode ruleConfiguration,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            string ruleConfigurationPath = GetPathToRuleConfiguration(layoutSetName);
            string serializedRuleConfiguration = ruleConfiguration.ToJsonString(s_jsonOptions);
            await WriteTextByRelativePathAsync(
                ruleConfigurationPath,
                serializedRuleConfiguration,
                cancellationToken: cancellationToken
            );
        }

        /// <summary>
        /// Gets the RuleConfiguration.json for a specific layout set
        /// </summary>
        /// <param name="layoutSetName">The name of the layout set where the layout belong</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The content of RuleConfiguration.json</returns>
        public async Task<string> GetRuleConfigAndAddDataToRootIfNotAlreadyPresent(
            string layoutSetName,
            CancellationToken cancellationToken = default
        )
        {
            string ruleConfigurationPath = GetPathToRuleConfiguration(layoutSetName);
            if (FileExistsByRelativePath(ruleConfigurationPath))
            {
                string ruleConfiguration = await ReadTextByRelativePathAsync(
                    ruleConfigurationPath,
                    cancellationToken
                );
                string fixedRuleConfig = await AddDataToRootOfRuleConfigIfNotPresent(
                    layoutSetName,
                    ruleConfiguration,
                    cancellationToken
                );
                return fixedRuleConfig;
            }
            throw new FileNotFoundException("Rule configuration not found.");
        }

        private async Task<string> AddDataToRootOfRuleConfigIfNotPresent(
            string layoutSetName,
            string ruleConfigData,
            CancellationToken cancellationToken = default
        )
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

        /// <summary>
        /// Gets the cshtml file for the app
        /// </summary>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The content of Index.cshtml</returns>
        public async Task<string> GetAppFrontendCshtml(
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (FileExistsByRelativePath(CshtmlPath))
            {
                string cshtml = await ReadTextByRelativePathAsync(CshtmlPath, cancellationToken);
                return cshtml;
            }

            throw new FileNotFoundException("Index.cshtml was not found.");
        }

        /// <summary>
        /// Gets a list of file names from the Options folder representing the available options lists.
        /// </summary>
        /// <returns>A list of option list names.</returns>
        public string[] GetOptionsListIds()
        {
            if (!DirectoryExistsByRelativePath(OptionsFolderPath))
            {
                return [];
            }

            string[] fileNames = GetFilesByRelativeDirectoryAscSorted(OptionsFolderPath, "*.json");
            IEnumerable<string> optionsListIds = fileNames.Select(Path.GetFileNameWithoutExtension);
            return optionsListIds.ToArray();
        }

        /// <summary>
        /// Gets a specific options list with the provided id.
        /// </summary>
        /// <param name="optionsListId">The name of the options list to fetch.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The options list as a string.</returns>
        public async Task<string> GetOptionsList(
            string optionsListId,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();

            string optionsFilePath = Path.Combine(OptionsFolderPath, $"{optionsListId}.json");
            if (!FileExistsByRelativePath(optionsFilePath))
            {
                throw new NotFoundException($"Options file {optionsListId}.json was not found.");
            }
            string fileContent = await ReadTextByRelativePathAsync(
                optionsFilePath,
                cancellationToken
            );

            return fileContent;
        }

        /// <summary>
        /// Creates or overwrites the options list with the provided id.
        /// If the options list already exists, it will be overwritten.
        /// </summary>
        /// <param name="optionsListId">The name of the options list to create.</param>
        /// <param name="payload">The contents of the new options list as a string</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The new options list as a string.</returns>
        public async Task<string> CreateOrOverwriteOptionsList(
            string optionsListId,
            List<Option> payload,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();

            var serialiseOptions = new JsonSerializerOptions { WriteIndented = true };
            string payloadString = JsonSerializer.Serialize(payload, serialiseOptions);

            string optionsFilePath = Path.Combine(OptionsFolderPath, $"{optionsListId}.json");
            await WriteTextByRelativePathAsync(
                optionsFilePath,
                payloadString,
                true,
                cancellationToken
            );
            string fileContent = await ReadTextByRelativePathAsync(
                optionsFilePath,
                cancellationToken
            );

            return fileContent;
        }

        /// <summary>
        /// Deletes the option list with the provided id.
        /// </summary>
        /// <param name="optionsListId">The name of the option list to create.</param>
        public void DeleteOptionsList(string optionsListId)
        {
            string optionsFilePath = Path.Combine(OptionsFolderPath, $"{optionsListId}.json");
            if (!FileExistsByRelativePath(optionsFilePath))
            {
                throw new NotFoundException($"Options file {optionsListId}.json was not found.");
            }

            DeleteFileByRelativePath(optionsFilePath);
        }

        /// <summary>
        /// Updates the ID of the option list by updating file name.
        /// </summary>
        /// <param name="oldOptionsListFileName">The file name of the option list to change filename of.</param>
        /// <param name="newOptionsListFileName">The new file name of the option list file.</param>
        public void UpdateOptionsListId(
            string oldOptionsListFileName,
            string newOptionsListFileName
        )
        {
            string currentFilePath = Path.Combine(OptionsFolderPath, oldOptionsListFileName);
            string newFilePath = Path.Combine(OptionsFolderPath, newOptionsListFileName);
            MoveFileByRelativePath(currentFilePath, newFilePath, newOptionsListFileName);
        }

        /// <summary>
        /// Saves the process definition file on disk.
        /// </summary>
        /// <param name="file">Stream of the file to be saved.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public async Task SaveProcessDefinitionFileAsync(
            Stream file,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (file.Length > 1000_000)
            {
                throw new ArgumentException("Bpmn file is too large");
            }
            await Guard.AssertValidXmlStreamAndRewindAsync(file);

            await WriteStreamByRelativePathAsync(
                ProcessDefinitionFilePath,
                file,
                true,
                cancellationToken
            );
        }

        public Stream GetProcessDefinitionFile()
        {
            if (!FileExistsByRelativePath(ProcessDefinitionFilePath))
            {
                throw new NotFoundHttpRequestException("Bpmn file not found.");
            }

            return OpenStreamByRelativePath(ProcessDefinitionFilePath);
        }

        public Definitions GetDefinitions()
        {
            using Stream processDefinitionStream = GetProcessDefinitionFile();
            XmlSerializer serializer = new(typeof(Definitions));
            Definitions definitions = (Definitions)serializer.Deserialize(processDefinitionStream);

            return definitions;
        }

        /// <summary>
        /// Checks if image already exists in wwwroot
        /// </summary>
        /// <param name="imageFilePath">The file path of the image from wwwroot</param>
        /// <returns>A boolean indication if image exists</returns>
        public bool DoesImageExist(string imageFilePath)
        {
            return FileExistsByRelativePath(GetPathToImage(imageFilePath));
        }

        /// <summary>
        /// Gets specified image from App/wwwroot folder of local repo
        /// </summary>
        /// <param name="imageFilePath">The file path of the image</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The image as stream</returns>
        public Stream GetImageAsStreamByFilePath(
            string imageFilePath,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            string imagePath = GetPathToImage(imageFilePath);
            return OpenStreamByRelativePath(imagePath);
        }

        /// <summary>
        /// Delete specified image from App/wwwroot folder of local repo
        /// </summary>
        /// <param name="imageFilePath">The file path of the image</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The image as stream</returns>
        public Task DeleteImageByImageFilePath(
            string imageFilePath,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            string imagePath = GetPathToImage(imageFilePath);
            DeleteFileByRelativePath(imagePath);
            return Task.CompletedTask;
        }

        /// <summary>
        /// Gets all image filePathNames from App/wwwroot folder of local repo
        /// </summary>
        /// <returns>Array of file paths to all images in App/wwwroot</returns>
        public List<string> GetAllImageFileNames()
        {
            List<string> allFilePaths = new List<string>();
            if (!DirectoryExistsByRelativePath(ImagesFolderName))
            {
                return allFilePaths;
            }

            // Make sure to sync this list of fileExtensions in frontend if changed until the below issue is done:
            // ISSUE: https://github.com/Altinn/altinn-studio/issues/13649
            string[] allowedExtensions =
            {
                ".png",
                ".jpg",
                ".jpeg",
                ".svg",
                ".gif",
                ".bmp",
                ".webp",
                ".tiff",
                ".ico",
                ".heif",
                ".heic",
            };

            IEnumerable<string> files = GetFilesByRelativeDirectory(ImagesFolderName, "*.*", true)
                .Where(file => allowedExtensions.Contains(Path.GetExtension(file).ToLower()))
                .Select(file =>
                    Path.GetRelativePath(
                        GetAbsoluteFileOrDirectoryPathSanitized(ImagesFolderName),
                        file
                    )
                );

            allFilePaths.AddRange(files);

            return allFilePaths;
        }

        /// <summary>
        /// Finds all schema files in App/models directory.
        /// </summary>
        public IList<AltinnCoreFile> GetSchemaFiles(bool xsd = false)
        {
            string schemaFilesPattern = xsd ? SchemaFilePatternXsd : SchemaFilePatternJson;
            string schemaFilesPath = Path.Combine(ModelFolderPath, schemaFilesPattern);
            IEnumerable<string> schemaFiles;

            try
            {
                schemaFiles = FindFiles(new[] { schemaFilesPath });
            }
            catch (DirectoryNotFoundException)
            {
                schemaFiles = new List<string>();
            }

            var altinnCoreSchemaFiles = MapFilesToAltinnCoreFiles(schemaFiles);

            return altinnCoreSchemaFiles;
        }

        private List<AltinnCoreFile> MapFilesToAltinnCoreFiles(IEnumerable<string> schemaFiles)
        {
            List<AltinnCoreFile> altinnCoreSchemaFiles = new();

            foreach (string file in schemaFiles)
            {
                altinnCoreSchemaFiles.Add(AltinnCoreFile.CreateFromPath(file, RepositoryDirectory));
            }

            return altinnCoreSchemaFiles;
        }

        /// <summary>
        /// Gets the relative path to a json schema model.
        /// </summary>
        /// <param name="modelName">The name of the model without extensions.</param>
        /// <returns>A string with the relative path to the model file, including file extension. </returns>
        private string GetPathToModelJsonSchema(string modelName)
        {
            return Path.Combine(ModelFolderPath, $"{modelName}.schema.json");
        }

        private static string GetPathToTexts()
        {
            return Path.Combine(ConfigFolderPath, LanguageResourceFolderName);
        }

        private static string GetPathToImage(string imageFilePath)
        {
            return Path.Combine(ImagesFolderName, imageFilePath);
        }

        private static string GetPathToJsonTextsFile(string fileName)
        {
            return string.IsNullOrEmpty(fileName)
                ? Path.Combine(ConfigFolderPath, LanguageResourceFolderName)
                : Path.Combine(ConfigFolderPath, LanguageResourceFolderName, fileName);
        }

        // can be null if app does not use layout set
        private static string GetPathToLayoutSet(
            string layoutSetName,
            bool excludeLayoutsFolderName = false
        )
        {
            var layoutFolderName = excludeLayoutsFolderName ? string.Empty : LayoutsInSetFolderName;
            return string.IsNullOrEmpty(layoutSetName)
                ? Path.Combine(LayoutsFolderName, layoutFolderName)
                : Path.Combine(LayoutsFolderName, layoutSetName, layoutFolderName);
        }

        // can be null if app does not use layout set
        private static string GetPathToLayoutFile(string layoutSetName, string layoutName)
        {
            return string.IsNullOrEmpty(layoutSetName)
                ? Path.Combine(LayoutsFolderName, LayoutsInSetFolderName, $"{layoutName}.json")
                : Path.Combine(
                    LayoutsFolderName,
                    layoutSetName,
                    LayoutsInSetFolderName,
                    $"{layoutName}.json"
                );
        }

        // can be null if app does not use layout set
        private static string GetPathToLayoutSettings(string layoutSetName)
        {
            return string.IsNullOrEmpty(layoutSetName)
                ? Path.Combine(LayoutsFolderName, LayoutSettingsFilename)
                : Path.Combine(LayoutsFolderName, layoutSetName, LayoutSettingsFilename);
        }

        private static string GetPathToLayoutSetsFile()
        {
            return Path.Combine(LayoutsFolderName, LayoutSetsFilename);
        }

        private static string GetPathToFooterFile()
        {
            return Path.Combine(LayoutsFolderName, FooterFilename);
        }

        private static string GetPathToRuleHandler(string layoutSetName)
        {
            return string.IsNullOrEmpty(layoutSetName)
                ? Path.Combine(LayoutsFolderName, RuleHandlerFilename)
                : Path.Combine(LayoutsFolderName, layoutSetName, RuleHandlerFilename);
        }

        private static string GetPathToRuleConfiguration(string layoutSetName)
        {
            return string.IsNullOrEmpty(layoutSetName)
                ? Path.Combine(LayoutsFolderName, RuleConfigurationFilename)
                : Path.Combine(LayoutsFolderName, layoutSetName, RuleConfigurationFilename);
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
