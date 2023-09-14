using Altinn.Codelists.SSB.Clients;

namespace Altinn.Codelists.SSB
{
    /// <summary>
    /// Client to get classification codes.
    /// </summary>
    public interface IClassificationsClient
    {
        /// <summary>
        /// Gets the codes for the specified classification. If no date is specified, the current date is used.
        /// </summary>
        Task<ClassificationCodes> GetClassificationCodes(int classificationId, string language = "nb", DateOnly? atDate = null, string level = "", string variant = "", string selectCodes = "");
    }
}