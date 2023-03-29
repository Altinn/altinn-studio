using Altinn.Codelists.Posten.Clients;

namespace Altinn.Codelists.Posten
{
    /// <summary>
    /// Client for getting postal codes
    /// </summary>
    public interface IPostalCodesClient
    {
        /// <summary>
        /// Get all postal codes.
        /// </summary>
        /// <returns></returns>
        Task<List<PostalCodeRecord>> GetPostalCodes();
    }
}
