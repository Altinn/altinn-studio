using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using System.Threading.Tasks;

namespace Altinn.Common.PEP.Interfaces
{
    public interface IAuthorization
    {
        /// <summary>
        /// Sends in a request to check if the user is permitted to execute task
        /// </summary>
        /// <param name="xacmlJsonRequest">The Xacml Json Request</param>
        /// <returns>The Xacml Json response will tell if the user has permission or not</returns>
        Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequest xacmlJsonRequest);
    }
}
