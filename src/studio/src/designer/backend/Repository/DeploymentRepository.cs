using Altinn.Studio.Designer.Infrastructure.Models;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Repository
{
    /// <summary>
    /// DeploymentRepository
    /// </summary>
    public class DeploymentRepository : DocumentRepository
    {
        /// <summary>
        /// DeploymentRepository
        /// </summary>
        public DeploymentRepository(
            IOptions<AzureCosmosDbSettings> options,
            IDocumentClient documentClient)
            : base(options.Value.DeploymentCollection, options, documentClient)
        {
        }
    }
}
