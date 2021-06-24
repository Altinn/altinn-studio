using System.Collections.Generic;
using System.Threading.Tasks;
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
            var altinnGitRepository = _altinnGitRepositoryFactory.GetRepository(org, repository, developer);

            return altinnGitRepository.GetSchemaFiles();            
        }

        /// <inheritdoc/>
        public Task UpdateSchemaFile(string org, string repository, string developer, string filePath, string content)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetRepository(org, repository, developer);

            throw new System.NotImplementedException();
        }
    }
}
