using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Model;

namespace Altinn.Platform.Authentication.Services.Interfaces
{
    /// <summary>
    /// Interface handling methods for operations related to authentication of enterpriseusers
    /// </summary>
    public interface IEnterpriseUserAuthenticationService
    {
        /// <summary>
        /// Method that fetches a response from authentication on sblbridge
        /// </summary>
        /// <param name="credentials">Credentials for an enterpriseuser</param>
        /// <returns>User profile connected to given credentials</returns>
        Task<HttpResponseMessage> AuthenticateEnterpriseUser(EnterpriseUserCredentials credentials);
    }
}
