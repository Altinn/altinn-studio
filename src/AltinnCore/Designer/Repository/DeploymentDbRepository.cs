using AltinnCore.Designer.Infrastructure.Models;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Repository
{
    /// <summary>
    /// DeploymentDbRepository
    /// </summary>
    public class DeploymentDbRepository : DocumentDbRepository
    {
        /// <summary>
        /// DeploymentDbRepository
        /// </summary>
        public DeploymentDbRepository(
            IOptions<AzureCosmosDbSettings> options,
            IDocumentClient documentClient,
            ILogger<DocumentDbRepository> logger)
            : base(options.Value.DeploymentCollection, options, documentClient, logger)
        {
        }
    }
}
