using System.Threading.Tasks;
using Altinn.Platform.Authentication.Model;

namespace Altinn.Platform.Authentication.Services.Interfaces
{
    /// <summary>
    /// Defines the methods needed to decrypt an SBL .ASPXAUTH cookie.
    /// </summary>
    public interface ISblCookieDecryptionService
    {
        /// <summary>
        /// Decrypt the ticket information in an SBL .ASPXAUTH cookie.
        /// </summary>
        /// <param name="encryptedTicket">The content of the .ASPXAUTH cookie</param>
        /// <returns>Decrypted user data</returns>
        Task<UserAuthenticationModel> DecryptTicket(string encryptedTicket);
    }
}
