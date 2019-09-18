using System.Net;
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
        Task<HttpStatusCode> RefreshToken();
    }
}
