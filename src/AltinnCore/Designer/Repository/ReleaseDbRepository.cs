using AltinnCore.Designer.Infrastructure.Models;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Repository
{
    /// <summary>
    /// ReleaseDbRepository
    /// </summary>
    public class ReleaseDbRepository : DocumentDbRepository
    {
        /// <summary>
        /// Constructor
        /// </summary>
        public ReleaseDbRepository(
            IOptions<AzureCosmosDbSettings> options,
            IDocumentClient documentClient,
            ILogger<DocumentDbRepository> logger)
            : base(options.Value.ReleaseCollection, options, documentClient, logger)
        {
        }
    }
}
