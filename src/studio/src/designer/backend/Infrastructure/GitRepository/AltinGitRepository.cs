using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository
{
    /// <summary>
    /// Class representing a Altinn Git Repository, either an app or a datamodels repository,
    /// ie. the shared properties and functionallity between the different types of repositories.
    /// </summary>
    public class AltinGitRepository
    {
        const string SCHEMA_FILES_PATTERN_XSD = "*.xsd";
        const string SCHEMA_FILES_PATTERN_JSON = "*.schema.json";        

        /// <summary>
        /// Initializes a new instance of the <see cref="AltinGitRepository"/> class.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="developer">Developer that is working on the repository.</param>
        /// <param name="repositoriesRootPath">Base path for where the repository recides on-disk.</param>
        public AltinGitRepository(string org, string repository, string developer, string repositoriesRootPath)
        {            
            AssertNotNullOrEmpty(org, nameof(org));
            AssertNotNullOrEmpty(repository, nameof(repository));
            AssertNotNullOrEmpty(developer, nameof(developer));
            AssertNotNullOrEmpty(repositoriesRootPath, nameof(repositoriesRootPath));
            AssertDirectoryExists(repositoriesRootPath);

            Org = org;
            Repository = repository;
            Developer = developer;
            RepositoriesRootPath = Path.GetFullPath(repositoriesRootPath); // We do this to normalize the path according to the OS and avoid slashes in all directions.
            RepositoryDirectory = SetRepositoryDirectory();
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
        /// Root path for where the repositories recides on-disk.        
        /// </summary>
        public string RepositoriesRootPath { get; private set; }

        /// <summary>
        /// The path to where this particular repository recides on-disk.
        /// </summary>
        public string RepositoryDirectory { get; private set; }

        /// <summary>
        /// Gets the full path to the on-disk repository directory based
        /// on basepath, developer, org and repository for the current repository.
        /// </summary>        
        /// <returns>The full path, ending with "/"</returns>
        private string SetRepositoryDirectory()
        {
            string[] paths = { RepositoriesRootPath, Developer.AsFileName(), Org.AsFileName(), Repository.AsFileName() };
            return Path.Combine(paths);
        }

        /// <summary>
        /// Finds all schema files regardless of type ie. JSON Schema, XSD and C# generated classes.
        /// </summary>
        /// <returns></returns>
        public IList<AltinnCoreFile> GetSchemaFiles()
        {
            var altinnCoreSchemaFiles = new List<AltinnCoreFile>();
            
            var schemaFiles = GetFiles(new string[] { SCHEMA_FILES_PATTERN_JSON, SCHEMA_FILES_PATTERN_XSD });

            foreach (string file in schemaFiles)
            {
                altinnCoreSchemaFiles.Add(AltinnCoreFile.CreateFromPath(file, RepositoryDirectory));
            }
            
            return altinnCoreSchemaFiles;
        }

        private IEnumerable<string> GetFiles(string[] searchPatterns)
        {
            var files = new List<string>();

            foreach (var searchPattern in searchPatterns)
            {
                files.AddRange(Directory.EnumerateFiles(RepositoryDirectory, searchPattern, new EnumerationOptions { MatchCasing = MatchCasing.CaseInsensitive, RecurseSubdirectories = true }));
            }

            return files;
        }

        private static void AssertNotNullOrEmpty(string paramValue, string paramName)
        {
            if (string.IsNullOrEmpty(paramValue))
            {                
                throw new ArgumentException($"'{paramName}' cannot be null or empty.", nameof(paramName));
            }
        }

        private static void AssertDirectoryExists(string path)
        {
            if (!Directory.Exists(path))
            {
                throw new DirectoryNotFoundException($"Could not find the specified path: {path}");
            }
        }
    }
}
