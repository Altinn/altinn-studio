using System.Collections.Generic;
using System.IO;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository
{
    /// <summary>
    /// Class representing a Altinn Git Repository, either an app or a datamodels repository,
    /// ie. the shared properties and functionallity between the different types of repositories.
    /// </summary>
    public class AltinnGitRepository : GitRepository, IAltinnGitRepository
    {
        private const string SCHEMA_FILES_PATTERN_XSD = "*.xsd";
        private const string SCHEMA_FILES_PATTERN_JSON = "*.schema.json";        

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
        /// Finds all schema files regardless of type ie. JSON Schema, XSD and C# generated classes.
        /// </summary>
        /// <returns></returns>
        public IList<AltinnCoreFile> GetSchemaFiles()
        {
            var schemaFiles = FindFiles(new string[] { SCHEMA_FILES_PATTERN_JSON, SCHEMA_FILES_PATTERN_XSD });

            var altinnCoreSchemaFiles = MapFilesToAltinnCoreFiles(schemaFiles);

            return altinnCoreSchemaFiles;
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
