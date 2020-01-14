using System;
using System.Threading.Tasks;

namespace AltinnCore.Designer.TypedHttpClients.AltinnAuthentication
{
    /// <summary>
    /// IAltinnAuthenticationClient
    /// </summary>
    public interface IAltinnAuthenticationClient
    {
        /// <summary>
        /// Converts a token
        /// </summary>
        /// <param name="token">Token to be converted</param>
        /// <param name="uri">The endpoint URI. Logic will use the Scheme and Host properties when building a full URL.</param>
        /// <returns>converted token</returns>
        Task<string> ConvertTokenAsync(string token, Uri uri);
    }
}
