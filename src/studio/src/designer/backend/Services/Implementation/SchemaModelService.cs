using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Options;

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
        private readonly IOptions<ServiceRepositorySettings> _serviceRepositorySettings;        

        /// <summary>
        /// Initializes a new instance of the <see cref="SchemaModelService"/> class.
        /// </summary>
        /// <param name="serviceRepositorySettings">Settings controlling the repository</param>
        public SchemaModelService(IOptions<ServiceRepositorySettings> serviceRepositorySettings)
        {
            _serviceRepositorySettings = serviceRepositorySettings;
        }

        /// <inheritdoc/>
        public Task<IList<AltinnCoreFile>> GetSchemaFilesAsync(string org, string repository, string developer)
        {
            var altinnGitRepository = new AltinGitRepository(org, repository, developer, _serviceRepositorySettings.Value.RepositoryLocation);

            return Task.FromResult(altinnGitRepository.GetSchemaFiles());            
        }
    }
}
