using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
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
    /// and not any methods that are specific to App or Datamodels repositories.
    public class AltinnGitRepository : GitRepository, IAltinnGitRepository
    {
        private const string SCHEMA_FILES_PATTERN_JSON = "*.schema.json";
        private const string STUDIO_SETTINGS_FILEPATH = ".altinnstudio/settings.json";

        private AltinnStudioSettings _altinnStudioSettings;
        private AltinnRepositoryType _repositoryType;

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
        internal AltinnStudioSettings AltinnStudioSettings
        {
            get
            {
                if (_altinnStudioSettings == null)
                {
                    _altinnStudioSettings = GetAltinnStudioSettings();
                }

                return _altinnStudioSettings;
            }
        }

        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        public AltinnRepositoryType RepositoryType
        {
            get
            {
                if (_repositoryType == AltinnRepositoryType.Unknown)
                {
                    _repositoryType = GetRepositoryType();
                }

                return _repositoryType;
            }
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

        private AltinnStudioSettings GetAltinnStudioSettings()
        {
            var studioSettingsFilePath = Path.Combine(RepositoryDirectory, STUDIO_SETTINGS_FILEPATH);

            // AltinnStudioSettings doesn't always exists (earlier versions of the app template), so
            // for these we return a default which assumes that it is an app repo.
            if (!File.Exists(studioSettingsFilePath))
            {
                return new AltinnStudioSettings() { RepoType = "app" };
            }

            var altinnStudioSettingsJson = ReadTextByAbsolutePathAsync(studioSettingsFilePath).Result;
            var altinnStudioSettings = JsonSerializer.Deserialize<AltinnStudioSettings>(altinnStudioSettingsJson, new JsonSerializerOptions() { PropertyNameCaseInsensitive = true });

            return altinnStudioSettings;
        }

        private AltinnRepositoryType GetRepositoryType()
        {            
            return Enum.Parse<AltinnRepositoryType>(AltinnStudioSettings.RepoType, true);
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
