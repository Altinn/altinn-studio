using System.Threading.Tasks;

namespace AltinnCore.Designer.Services
{
    /// <summary>
    /// IPlatformAuthenticator
    /// </summary>
    public interface IPlatformAuthenticator
    {
        /// <summary>
        /// Gets converted Maskinporten token
        /// </summary>
        /// <returns>Converted token</returns>
        Task<string> GetConvertedTokenAsync();
    }
}
