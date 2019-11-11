using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace App.IntegrationTests.Mocks.Services
{
    public class PepAuthorizationMockSI : Altinn.Common.PEP.Interfaces.IPDP
    {
        public Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequest xacmlJsonRequest)
        {
            // Create response
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            // Add result and set decision to permit
            XacmlJsonResult result = new XacmlJsonResult();
            result.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(result);

            return Task.FromResult(response);
        }
    }
}
