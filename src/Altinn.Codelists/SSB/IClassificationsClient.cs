using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.SSB.Models;

namespace Altinn.Codelists.SSB
{
    /// <summary>
    /// Client to get classification codes.
    /// </summary>
    public interface IClassificationsClient
    {
        /// <summary>
        /// Gets the codes for the specified classification.
        /// </summary>
        Task<ClassificationCodes> GetClassificationCodes(Classification classification);
    }
}