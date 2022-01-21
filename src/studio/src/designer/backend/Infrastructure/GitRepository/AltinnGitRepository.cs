using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository
{
    /// <summary>
    /// Class representing a Altinn Git Repository, either an app or a datamodels repository,
    /// ie. the shared properties and functionallity between the different types of repositories.
    /// </summary>
    /// <remarks>This class knows that the repository is an Altinn Repository and hence knows
    /// about folders and file names and can map them to their respective models.
    /// It shoud hovever only have methods that are shared between the different types of Altinn Repositories
    /// and not any methods that are specific to App or Datamodels repositories.</remarks>
    public class AltinnGitRepository : GitRepository, IAltinnGitRepository
    {
        private const string SCHEMA_FILES_PATTERN_JSON = "*.schema.json";
        private const string STUDIO_SETTINGS_FILEPATH = ".altinnstudio/settings.json";

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
        /// <inheritdoc/>
        /// </summary>
        public async Task<DatamodellingPreference> GetDatamodellingPreference()
        {
            var settings = await GetAltinnStudioSettings();
            return settings.DatamodellingPreference;
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
        public IList<AltinnCoreFile> GetSchemaFiles()
        {
            var schemaFiles = FindFiles(new string[] { SCHEMA_FILES_PATTERN_JSON });

            var altinnCoreSchemaFiles = MapFilesToAltinnCoreFiles(schemaFiles);

            return altinnCoreSchemaFiles;
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
            AltinnStudioSettings newAltinnStudioSettings;
            if (IsDatamodelsRepo())
            {
                newAltinnStudioSettings = new AltinnStudioSettings() { RepoType = AltinnRepositoryType.Datamodels, DatamodellingPreference = DatamodellingPreference.JsonSchema };
            }
            else
            {
                newAltinnStudioSettings = new AltinnStudioSettings() { RepoType = AltinnRepositoryType.App, DatamodellingPreference = DatamodellingPreference.Xsd };
            }

            await WriteObjectByRelativePathAsync(STUDIO_SETTINGS_FILEPATH, newAltinnStudioSettings, true);

            return newAltinnStudioSettings;
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

            if (altinnStudioSettings.DatamodellingPreference == DatamodellingPreference.Unknown)
            {
                altinnStudioSettings.DatamodellingPreference = IsDatamodelsRepo() ? DatamodellingPreference.JsonSchema : DatamodellingPreference.Xsd;
                needsSaving = true;
            }

            return (altinnStudioSettings, needsSaving);
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
