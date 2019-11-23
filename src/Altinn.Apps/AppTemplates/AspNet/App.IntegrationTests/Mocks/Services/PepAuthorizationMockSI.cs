using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace App.IntegrationTests.Mocks.Services
{
    public class PepAuthorizationMockSI : Altinn.Common.PEP.Interfaces.IPDP
    {
        public Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequest xacmlJsonRequest)
        {
            List<XacmlJsonCategory> resources = xacmlJsonRequest.Resource;

            XacmlJsonAttribute attribute = resources.Select(r => r.Attribute.Find(a => a.Value.Equals("endring-av-navn"))).FirstOrDefault();

            // Create response and result
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            XacmlJsonResult result = new XacmlJsonResult();

            if (attribute != null)
            {
                // Set decision to permit
                result.Decision = XacmlContextDecision.Permit.ToString();
                response.Response.Add(result);

                return Task.FromResult(response);
            }

            XacmlJsonAttribute attribute2 = resources.Select(r => r.Attribute.Find(a => a.Value.Equals("multiple-results"))).FirstOrDefault();

            if (attribute2 != null)
            {
                // Set decision to permit
                result.Decision = XacmlContextDecision.Permit.ToString();
                response.Response.Add(result);
                response.Response.Add(new XacmlJsonResult());

                return Task.FromResult(response);
            }

            XacmlJsonAttribute attribute3 = resources.Select(r => r.Attribute.Find(a => a.Value.Equals("auth-level-2"))).FirstOrDefault();

            if (attribute3 != null)
            {
                // Set decision to permit
                result.Decision = XacmlContextDecision.Permit.ToString();
                response.Response.Add(result);

                // Add obligation to result with a minimum authentication level attribute
                XacmlJsonObligationOrAdvice obligation = new XacmlJsonObligationOrAdvice();
                obligation.AttributeAssignment = new List<XacmlJsonAttributeAssignment>();
                XacmlJsonAttributeAssignment authenticationAttribute = new XacmlJsonAttributeAssignment()
                {
                    Category = "urn:altinn:minimum-authenticationlevel",
                    Value = "2"
                };
                obligation.AttributeAssignment.Add(authenticationAttribute);
                result.Obligations = new List<XacmlJsonObligationOrAdvice>();
                result.Obligations.Add(obligation);

                return Task.FromResult(response);
            }

            XacmlJsonAttribute attribute4 = resources.Select(r => r.Attribute.Find(a => a.Value.Equals("auth-level-3"))).FirstOrDefault();

            if (attribute4 != null)
            {
                // Set decision to permit
                result.Decision = XacmlContextDecision.Permit.ToString();
                response.Response.Add(result);

                // Add obligation to result with a minimum authentication level attribute
                XacmlJsonObligationOrAdvice obligation = new XacmlJsonObligationOrAdvice();
                obligation.AttributeAssignment = new List<XacmlJsonAttributeAssignment>();
                XacmlJsonAttributeAssignment authenticationAttribute = new XacmlJsonAttributeAssignment()
                {
                    Category = "urn:altinn:minimum-authenticationlevel",
                    Value = "3"
                };
                obligation.AttributeAssignment.Add(authenticationAttribute);
                result.Obligations = new List<XacmlJsonObligationOrAdvice>();
                result.Obligations.Add(obligation);

                return Task.FromResult(response);
            }

            // Set decision to deny
            result.Decision = XacmlContextDecision.Deny.ToString();
            response.Response.Add(result);

            return Task.FromResult(response);
        }

        public Task<bool> GetDecisionForUnvalidateRequest(XacmlJsonRequest xacmlJsonRequest, ClaimsPrincipal user)
        {
            throw new NotImplementedException();
        }
    }
}
