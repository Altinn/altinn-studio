using AltinnCore.Designer.Infrastructure.Models;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Repository
{
    /// <summary>
    /// ReleaseRepository
    /// </summary>
    public class ReleaseRepository : DocumentRepository
    {
        /// <summary>
        /// Constructor
        /// </summary>
        public ReleaseRepository(
            IOptions<AzureCosmosDbSettings> options,
            IDocumentClient documentClient)
            : base(options.Value.ReleaseCollection, options, documentClient)
        {
        }
    }
}
