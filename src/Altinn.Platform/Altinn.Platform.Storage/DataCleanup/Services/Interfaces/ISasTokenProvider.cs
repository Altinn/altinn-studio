using System.Threading.Tasks;

namespace Altinn.Platform.Storage.DataCleanup.Services
{
    /// <summary>
    /// This interface describes a component able to obtain and invalidate SAS tokens for communication with an Azure storage account.
    /// </summary>
    public interface ISasTokenProvider
    {
        /// <summary>
        /// Get the SAS token needed to access the storage account for given application owner.
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <returns>The SAS token to use when accessing the application owner storage account.</returns>
        Task<string> GetSasToken(string org);

        /// <summary>
        /// Have a stored SAS token removed from the internal collection.
        /// </summary>
        /// <param name="org">The application owner id.</param>
        void InvalidateSasToken(string org);
    }
}
