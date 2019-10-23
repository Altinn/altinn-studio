using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Authentication interface.
    /// </summary>
    public interface IAuthentication
    {
        /// <summary>
        /// Refreshes the AltinnStudioRuntime JwtToken.
        /// </summary>
        /// <returns>Response message from Altinn Platform with refreshed token.</returns>
        Task<string> RefreshToken();
    }
}
