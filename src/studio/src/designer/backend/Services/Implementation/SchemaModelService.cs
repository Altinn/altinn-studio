using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the <see cref="ISchemaModelService"/> providing methods
    /// to work on the schema models (JSON Schema, XSD and generated C# classes)
    /// within a repository. A repository can be either of app or datamodels type in which
    /// the schema files will be found in different locations.
    /// </summary>
    public class SchemaModelService : ISchemaModelService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="SchemaModelService"/> class.
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">Factory class that knows how to create types of <see cref="AltinnGitRepository"/></param>
        public SchemaModelService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        /// <inheritdoc/>
        public IList<AltinnCoreFile> GetSchemaFiles(string org, string repository, string developer)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            return altinnGitRepository.GetSchemaFiles();            
        }

        /// <inheritdoc/>
        public async Task UpdateSchema(string org, string repository, string developer, string relativeFilePath, string content)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            if (altinnGitRepository.RepositoryType == Enums.AltinnRepositoryType.Datamodels)
            {              
                await altinnGitRepository.WriteTextByRelativePathAsync(relativeFilePath, content);
            }
            else if (altinnGitRepository.RepositoryType == Enums.AltinnRepositoryType.App)
            {
                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);

                await altinnAppGitRepository.WriteTextByRelativePathAsync(relativeFilePath, content, true);

            }
        }

        /// <inheritdoc/>
        public async Task DeleteSchema(string org, string repository, string developer, string relativeFilePath)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);            

            if (altinnGitRepository.RepositoryType == Enums.AltinnRepositoryType.Datamodels)
            {
                altinnGitRepository.DeleteFileByRelativePath(relativeFilePath);                
            }
            else if (altinnGitRepository.RepositoryType == Enums.AltinnRepositoryType.App)
            {
                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);
                var altinnCoreFile = altinnGitRepository.GetAltinnCoreFileByRealtivePath(relativeFilePath);
                var schemaName = GetSchemaName(altinnCoreFile);

                await DeleteDatatypeFromApplicationMetadata(altinnAppGitRepository, schemaName);
                DeleteRelatedSchemaFiles(altinnAppGitRepository, schemaName, altinnCoreFile.Directory);
            }
        }

        private void DeleteRelatedSchemaFiles(AltinnAppGitRepository altinnAppGitRepository, string schemaName, string directory)
        {
            var files = GetRelatedSchemaFiles(schemaName, directory);
            foreach (var file in files)
            {
                altinnAppGitRepository.DeleteFileByAbsolutePath(file);
            }
        }

        private IEnumerable<string> GetRelatedSchemaFiles(string schemaName, string directory)
        {
            var xsdFile = Path.Combine(directory, $"{schemaName}.xsd");
            var jsonSchemaFile = Path.Combine(directory, $"{schemaName}.schema.json");

            return new List<string>() { jsonSchemaFile, xsdFile };
        }

        private string GetSchemaName(AltinnCoreFile altinnCoreFile)
        {
            if (altinnCoreFile.FileType.ToLower() == ".json" && altinnCoreFile.FileName.ToLower().EndsWith(".schema.json"))
            {
                return altinnCoreFile.FileName.Remove(altinnCoreFile.FileName.ToLower().IndexOf(".schema.json"));
            }
            else if (altinnCoreFile.FileType.ToLower() == ".xsd")
            {
                return altinnCoreFile.FileName;
            }

            return string.Empty;
        }

        private async Task DeleteDatatypeFromApplicationMetadata(AltinnAppGitRepository altinnAppGitRepository, string id)
        {
            var applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();

            if (applicationMetadata.DataTypes != null)
            {
                DataType removeForm = applicationMetadata.DataTypes.Find(m => m.Id == id);
                applicationMetadata.DataTypes.Remove(removeForm);
            }

            await altinnAppGitRepository.UpdateApplicationMetadata(applicationMetadata);
        }
    }
}
