using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using static Altinn.Studio.Designer.Infrastructure.GitRepository.AltinnAppGitRepository;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository
{
    /// <summary>
    /// Class representing a Altinn Git Repository, either an app or a datamodels repository,
    /// ie. the shared properties and functionallity between the different types of repositories.
    /// </summary>
    /// <remarks>This class knows that the repository is an Altinn Repository and hence knows
    /// about folders and file names and can map them to their respective models.
    /// It should however only have methods that are shared between the different types of Altinn Repositories
    /// and not any methods that are specific to App or Datamodels repositories.</remarks>
    public class AltinnGitRepository : GitRepository, IAltinnGitRepository
    {
        private const string SCHEMA_FILES_PATTERN_JSON = "*.schema.json";
        private const string SCHEMA_FILES_PATTERN_XSD = "*.xsd";
        private const string STUDIO_SETTINGS_FILEPATH = ".altinnstudio/settings.json";
        private const string TEXT_FILES_PATTERN_JSON = "*.texts.json";

        private AltinnStudioSettings _altinnStudioSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="AltinnGitRepository"/> class.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="developer">Developer that is working on the repository.</param>
        /// <param name="repositoriesRootDirectory">Base path (full) for where the repository recides on-disk.</param>
        /// <param name="repositoryDirectory">Full path to the root directory of this repository on-disk.</param>
        public AltinnGitRepository(string org, string repository, string developer, string repositoriesRootDirectory, string repositoryDirectory) : base(repositoriesRootDirectory, repositoryDirectory)
        {
            Guard.AssertNotNullOrEmpty(org, nameof(org));
            Guard.AssertNotNullOrEmpty(repository, nameof(repository));
            Guard.AssertNotNullOrEmpty(developer, nameof(developer));

            Org = org;
            Repository = repository;
            Developer = developer;
        }

        /// <summary>
        /// Short name representing the organization that owns the repository as defined in Gitea.
        /// </summary>
        public string Org { get; private set; }

        /// <summary>
        /// Name of the repository as defined in Gitea.
        /// </summary>
        public string Repository { get; private set; }

        /// <summary>
        /// Short name of the developer, as defined in Gitea, that is working on the repository.
        /// </summary>
        public string Developer { get; private set; }

        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        public async Task<AltinnRepositoryType> GetRepositoryType()
        {
            var settings = await GetAltinnStudioSettings();
            return settings.RepoType;
        }

        /// <summary>
        /// Saves the AltinnStudioSettings to disk.
        /// </summary>
        /// <param name="altinnStudioSettings">The <see cref="AltinnStudioSettings"/> object to save. This will overwrite the existing file.</param>
        public async Task SaveAltinnStudioSettings(AltinnStudioSettings altinnStudioSettings)
        {
            await WriteObjectByRelativePathAsync(STUDIO_SETTINGS_FILEPATH, altinnStudioSettings, true);
        }

        /// <summary>
        /// Finds all schema files regardless of location in repository.
        /// </summary>
        public IList<AltinnCoreFile> GetSchemaFiles(bool xsd = false)
        {
            string schemaFilesPattern = xsd ? SCHEMA_FILES_PATTERN_XSD : SCHEMA_FILES_PATTERN_JSON;
            var schemaFiles = FindFiles(new[] { schemaFilesPattern });

            var altinnCoreSchemaFiles = MapFilesToAltinnCoreFiles(schemaFiles);

            return altinnCoreSchemaFiles;
        }

        /// <summary>
        /// Parses the filename and extracts the logical schema name.
        /// </summary>
        /// <param name="filePath">Filepath to the model - either Json Schema or Xsd.</param>
        /// <returns>The logical schema name</returns>
        public string GetSchemaName(string filePath)
        {
            var fileInfo = new FileInfo(filePath);

            if (fileInfo.Extension.ToLower() == ".json" && fileInfo.Name.EndsWith(".schema.json"))
            {
                return fileInfo.Name.Remove(fileInfo.Name.ToLower().IndexOf(".schema.json"));
            }
            else if (fileInfo.Extension.ToLower() == ".xsd")
            {
                return fileInfo.Name.Remove(fileInfo.Name.ToLower().IndexOf(".xsd"));
            }

            return string.Empty;
        }

        /// <summary>
        /// Finds all texts files regardless of location in repository.
        /// </summary>
        public IList<string> GetLanguageFiles()
        {
            IEnumerable<string> languageFiles = FindFiles(new string[] { TEXT_FILES_PATTERN_JSON });

            return languageFiles.ToList();
        }

        /// <summary>
        /// Gets a <see cref="AltinnCoreFile"/> representation of a file. This does not load any
        /// file contents but i do ensure the file exists ang gives some easy handles to file location and url
        /// </summary>
        /// <param name="realtiveFilepath">The relative path to the file seen from the repository root.</param>
        public AltinnCoreFile GetAltinnCoreFileByRealtivePath(string realtiveFilepath)
        {
            var absoluteFilepath = GetAbsoluteFilePathSanitized(realtiveFilepath);
            return AltinnCoreFile.CreateFromPath(absoluteFilepath, RepositoryDirectory);
        }

        /// <summary>
        /// Gets the settings for this repository. This is the same as what can be found in .altinnstudio\settings.json
        /// </summary>
        public async Task<AltinnStudioSettings> GetAltinnStudioSettings()
        {
            if (_altinnStudioSettings != null)
            {
                return _altinnStudioSettings;
            }

            // AltinnStudioSettings doesn't always exists (earlier versions of the app template), so
            // need some reasonable defaults.
            if (!FileExistsByRelativePath(STUDIO_SETTINGS_FILEPATH))
            {
                _altinnStudioSettings = await CreateNewAltinnStudioSettings();
            }
            else
            {
                (AltinnStudioSettings altinnStudioSettings, bool needsSaving) = await MigrateExistingAltinnStudioSettings();

                if (needsSaving)
                {
                    await WriteObjectByRelativePathAsync(STUDIO_SETTINGS_FILEPATH, altinnStudioSettings);
                }

                _altinnStudioSettings = altinnStudioSettings;
            }

            return _altinnStudioSettings;
        }

        private async Task<AltinnStudioSettings> CreateNewAltinnStudioSettings()
        {
            AltinnStudioSettings settings;
            if (IsDatamodelsRepo())
            {
                settings = new AltinnStudioSettings() { RepoType = AltinnRepositoryType.Datamodels };
            }
            else
            {
                settings = new AltinnStudioSettings() { RepoType = AltinnRepositoryType.App };
            }

            await WriteObjectByRelativePathAsync(STUDIO_SETTINGS_FILEPATH, settings, true);

            return settings;
        }

        private async Task<(AltinnStudioSettings AltinnStudioSettinngs, bool NeedsSaving)> MigrateExistingAltinnStudioSettings()
        {
            var altinnStudioSettingsJson = await ReadTextByRelativePathAsync(STUDIO_SETTINGS_FILEPATH);
            var altinnStudioSettings = JsonSerializer.Deserialize<AltinnStudioSettings>(altinnStudioSettingsJson, new JsonSerializerOptions() { PropertyNameCaseInsensitive = true, Converters = { new JsonStringEnumConverter() } });

            var needsSaving = false;

            if (altinnStudioSettings.RepoType == AltinnRepositoryType.Unknown)
            {
                altinnStudioSettings.RepoType = IsDatamodelsRepo() ? AltinnRepositoryType.Datamodels : AltinnRepositoryType.App;
                needsSaving = true;
            }

            return (altinnStudioSettings, needsSaving);
        }

        /// <summary>
        /// Saves the Json Schema file representing the application model to disk.
        /// </summary>
        /// <param name="jsonSchema">The Json Schema that should be persisted</param>
        /// <param name="relativeFilePath">The relative file path of the json schema model</param>
        /// <returns>A string containing the relative path to the file saved.</returns>
        public virtual async Task<string> SaveJsonSchema(string jsonSchema, string relativeFilePath)
        {
            await WriteTextByRelativePathAsync(relativeFilePath, jsonSchema, true);

            return relativeFilePath;
        }

        /// <summary>
        /// Saves the Xsd to the disk.
        /// </summary>
        /// <param name="xsd">String representing the Xsd to be saved.</param>
        /// <param name="filePath">The filename of the file to be saved excluding path.</param>
        /// <returns>A string containg the relative path to the file saved.</returns>
        public virtual async Task<string> SaveXsd(string xsd, string filePath)
        {
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

        // Ideally this class should not know anything about app or datamodel differences.
        // The Altinn Studio settings is shared between the repository types and is in fact
        // where this knowledge is placed (RepoType), but in the case of a missing settings
        // file we either need this "hack" or migrate old repositories when it's opened to
        // include new files and/or settings added after the repository was crated.
        private bool IsDatamodelsRepo()
        {
            return Repository.Contains("-datamodels");
        }

        private List<AltinnCoreFile> MapFilesToAltinnCoreFiles(IEnumerable<string> schemaFiles)
        {
            var altinnCoreSchemaFiles = new List<AltinnCoreFile>();

            foreach (string file in schemaFiles)
            {
                altinnCoreSchemaFiles.Add(AltinnCoreFile.CreateFromPath(file, RepositoryDirectory));
            }

            return altinnCoreSchemaFiles;
        }
    }
}
