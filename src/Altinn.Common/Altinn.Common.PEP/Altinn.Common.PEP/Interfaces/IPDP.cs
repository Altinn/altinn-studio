using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using System.Threading.Tasks;

namespace Altinn.Common.PEP.Interfaces
{
    public interface IPDP
    {
        /// <summary>
        /// Sends in a request and get response with result of the request
        /// </summary>
        /// <param name="xacmlJsonRequest">The Xacml Json Request</param>
        /// <returns>The Xacml Json response contains the result of the request</returns>
        Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequest xacmlJsonRequest);
    }
}
